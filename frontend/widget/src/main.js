import { CSS } from './styles.js';

// SECURITY NOTE: all server- and user-supplied text is inserted with
// textContent / createTextNode, never innerHTML. Answers, titles, names and
// error messages are untrusted; innerHTML would let them inject markup/script
// into the host page (XSS).

const MAX_LEN = 1000;
const DEFAULT_COLOR = '#2563eb';
const MSG = {
  rate: "You're sending messages quickly. Please wait a moment and try again.",
  down: 'The assistant is unavailable right now. Please try again.',
  setup: "This chat isn't set up correctly.",
};

// Must be read synchronously while the script is executing.
const currentScript = document.currentScript;

function warn(msg) {
  console.warn('[AskDesk] ' + msg);
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v; // safe text insertion
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  if (children) children.forEach((c) => c && node.appendChild(c));
  return node;
}

function chatIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute(
    'd',
    'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.4L4 21.5V18a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'
  );
  svg.appendChild(path);
  return svg;
}

// ---- colour / contrast ------------------------------------------------------

function parseHex(color) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Pick black or white text, whichever has the higher WCAG contrast ratio.
function onColor(rgb) {
  const L = luminance(rgb);
  const vsWhite = 1.05 / (L + 0.05);
  const vsBlack = (L + 0.05) / 0.05;
  return vsWhite >= vsBlack ? '#ffffff' : '#111111';
}

// ---- SSE --------------------------------------------------------------------

async function readSSE(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (block) => {
    let event = 'message';
    const data = [];
    block.split('\n').forEach((line) => {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    });
    if (!data.length) return;
    let payload;
    try {
      payload = JSON.parse(data.join('\n'));
    } catch {
      return;
    }
    onEvent(event, payload);
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n');
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      flush(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
}

// Remove citation markers like [1], [2][3] or [1, 2] (plus the space before
// them) for display only. Also hides a marker that is still incomplete at the
// end of a streaming answer (e.g. "... refund [1"), since markers can be split
// across tokens.
function stripCitations(text) {
  return String(text || '')
    .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')
    .replace(/\s*\[[\d,\s]*$/, '')
    .trim();
}

function dedupeSources(sources) {
  const seen = new Set();
  const out = [];
  (sources || []).forEach((s) => {
    if (!s || !s.document_title) return;
    const line =
      'Source: ' + s.document_title + (s.page_number != null ? ', page ' + s.page_number : '');
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  });
  return out;
}

// ---- widget -----------------------------------------------------------------

function createWidget({ apiBase, apiKey, config }) {
  const storeKey = 'askdesk:' + apiKey;
  const rgb = parseHex(config.color) || parseHex(DEFAULT_COLOR);
  const brand = '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
  const businessName = String(config.business_name || 'Support');
  const greeting = String(config.greeting || 'Hi! How can I help you today?');

  let state = load();
  let streaming = false;
  let isOpen = false;

  function load() {
    try {
      const raw = sessionStorage.getItem(storeKey);
      const parsed = raw && JSON.parse(raw);
      if (parsed && Array.isArray(parsed.messages)) return parsed;
    } catch {
      /* storage blocked or corrupt */
    }
    return { conversationId: null, messages: [] };
  }
  function save() {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(state));
    } catch {
      /* storage blocked or full */
    }
  }

  function api(path, opts = {}) {
    return fetch(apiBase + path, {
      ...opts,
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
  }

  // ---- DOM
  const host = el('div', { id: 'askdesk-widget-root' });
  host.style.setProperty('--ad-brand', brand);
  host.style.setProperty('--ad-on-brand', onColor(rgb));
  const root = host.attachShadow({ mode: 'open' });
  root.appendChild(el('style', { text: CSS }));

  const launcher = el('button', {
    class: 'launcher',
    type: 'button',
    'aria-label': 'Open chat with ' + businessName,
    'aria-expanded': 'false',
    'aria-controls': 'askdesk-panel',
    onclick: () => (isOpen ? close() : open()),
  });
  launcher.appendChild(chatIcon());

  const titleId = 'askdesk-title';
  const newChatBtn = el('button', { class: 'hbtn', type: 'button', text: 'Start a new chat', onclick: newChat });
  const closeBtn = el('button', { class: 'hbtn close', type: 'button', 'aria-label': 'Close chat', text: '×', onclick: close });
  const list = el('div', { class: 'messages', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions text' });
  const input = el('textarea', {
    rows: '1',
    maxlength: String(MAX_LEN),
    placeholder: 'Type your question…',
    'aria-label': 'Your question',
  });
  const sendBtn = el('button', { class: 'primary', type: 'submit', text: 'Send' });
  const composer = el('form', { class: 'composer', onsubmit: (e) => { e.preventDefault(); submit(); } }, [input, sendBtn]);

  const panel = el(
    'div',
    { class: 'panel', id: 'askdesk-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': titleId, hidden: true },
    [el('div', { class: 'header' }, [el('h2', { class: 'title', id: titleId, text: businessName }), newChatBtn, closeBtn]), list, composer]
  );
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });
  input.addEventListener('input', autosize);

  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(host);

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  function scrollDown() {
    list.scrollTop = list.scrollHeight;
  }
  function setStreaming(v) {
    streaming = v;
    input.disabled = v;
    sendBtn.disabled = v;
    newChatBtn.disabled = v;
    list.setAttribute('aria-busy', v ? 'true' : 'false');
    if (!v && isOpen) input.focus();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Close chat');
    scrollDown();
    input.focus();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Open chat with ' + businessName);
    launcher.focus();
  }

  function newChat() {
    if (streaming) return;
    state = { conversationId: null, messages: [] };
    save();
    renderAll();
    input.focus();
  }

  // ---- rendering
  function bubble(role, text) {
    return el('div', { class: 'msg ' + role, text });
  }

  function renderBot(msg) {
    const node = bubble('bot', stripCitations(msg.text));
    const lines = dedupeSources(msg.sources);
    if (lines.length) {
      node.appendChild(el('ul', { class: 'sources' }, lines.map((l) => el('li', { text: l }))));
    }
    return node;
  }

  function renderMessage(msg) {
    if (msg.role === 'user') return [bubble('user', msg.text)];
    if (msg.role === 'error') return [errorBubble(msg)];
    const nodes = [renderBot(msg)];
    if (msg.ticket) nodes.push(ticketForm(msg));
    return nodes;
  }

  function renderAll() {
    list.textContent = '';
    list.appendChild(bubble('bot', greeting)); // UI only; never stored or sent
    state.messages.forEach((m) => renderMessage(m).forEach((n) => list.appendChild(n)));
    scrollDown();
  }

  // Error entries are kept in state so they (and their Retry button) survive a
  // page reload. msg.retry holds the question to resend.
  function errorBubble(msg) {
    const node = bubble('error', msg.text);
    node.setAttribute('role', 'alert');
    if (msg.retry) {
      node.appendChild(
        el('button', {
          class: 'retry',
          type: 'button',
          text: 'Retry',
          onclick: () => {
            if (streaming) return;
            // Drop the error, keep the original customer bubble, resend the same question
            const i = state.messages.indexOf(msg);
            if (i !== -1) state.messages.splice(i, 1);
            save();
            node.remove();
            ask(msg.retry);
          },
        })
      );
    }
    return node;
  }

  // ---- chat
  function submit() {
    if (streaming) return;
    const q = input.value.trim().slice(0, MAX_LEN);
    if (!q) return;
    input.value = '';
    autosize();
    state.messages.push({ role: 'user', text: q });
    save();
    list.appendChild(bubble('user', q));
    scrollDown();
    ask(q);
  }

  async function ask(question) {
    setStreaming(true);
    const node = bubble('bot', '');
    const typing = el('span', { class: 'typing', 'aria-label': 'Assistant is typing', role: 'status' }, [
      el('span'), el('span'), el('span'),
    ]);
    node.appendChild(typing);
    list.appendChild(node);
    scrollDown();

    let textNode = null;
    let raw = ''; // full answer as received (with citation markers)
    let finished = false;
    let failure = null; // { text, retry }

    try {
      const res = await api('/api/chat/ask/stream/', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: JSON.stringify({ question, conversation_id: state.conversationId || null }),
      });
      if (!res.ok || !res.body) {
        // The server may already have created the conversation (e.g. a 503 after
        // saving the question); keep its id so a retry stays in the same conversation.
        try {
          const err = await res.json();
          if (err && err.conversation_id) {
            state.conversationId = err.conversation_id;
            save();
          }
        } catch {
          /* non-JSON error body */
        }
        if (res.status === 429) failure = { text: MSG.rate };
        else if (res.status === 401 || res.status === 403) failure = { text: MSG.setup };
        else failure = { text: MSG.down, retry: true };
      } else {
        await readSSE(res.body, (event, data) => {
          if (finished) return;
          if (event === 'start') {
            if (data.conversation_id) {
              state.conversationId = data.conversation_id;
              save();
            }
          } else if (event === 'token') {
            if (!textNode) {
              typing.remove();
              textNode = document.createTextNode('');
              node.appendChild(textNode);
            }
            raw += data.text || '';
            // Strip from the full text each time: markers can be split across tokens
            textNode.data = stripCitations(raw);
            scrollDown();
          } else if (event === 'done') {
            finished = true;
            if (data.conversation_id) state.conversationId = data.conversation_id;
            const msg = { role: 'bot', text: String(data.answer || ''), sources: data.sources || [] };
            if (data.answered === false) msg.ticket = { question };
            state.messages.push(msg);
            save();
            const nodes = renderMessage(msg);
            node.replaceWith(nodes[0]);
            nodes.slice(1).forEach((n) => list.appendChild(n));
            scrollDown();
          } else if (event === 'error') {
            finished = true;
            failure = { text: MSG.down, retry: true };
          }
        });
        if (!finished) failure = { text: MSG.down, retry: true };
      }
    } catch {
      failure = { text: MSG.down, retry: true };
    }

    if (failure) {
      node.remove();
      const errMsg = { role: 'error', text: failure.text };
      if (failure.retry) errMsg.retry = question;
      state.messages.push(errMsg);
      save();
      list.appendChild(errorBubble(errMsg));
      scrollDown();
    }
    setStreaming(false);
  }

  // ---- ticket form
  function ticketForm(msg) {
    const t = msg.ticket;
    const uid = Math.random().toString(36).slice(2, 8);
    const email = el('input', { type: 'email', required: true, autocomplete: 'email', name: 'email', id: 'ad-email-' + uid });
    const details = el('textarea', { name: 'details', rows: '3', maxlength: '2000', id: 'ad-details-' + uid });
    const emailErr = el('span', { class: 'ferr', id: 'ad-email-err-' + uid });
    const detailsErr = el('span', { class: 'ferr', id: 'ad-details-err-' + uid });
    email.setAttribute('aria-describedby', emailErr.id);
    details.setAttribute('aria-describedby', detailsErr.id);
    const status = el('p', { role: 'status' });
    const btn = el('button', { class: 'primary', type: 'submit', text: 'Send to support' });

    const form = el('form', { class: 'ticket', novalidate: true, 'aria-label': 'Contact support' }, [
      el('p', { text: "I couldn't find an answer. Leave your email and our team will follow up." }),
      el('label', null, [document.createTextNode('Email'), email, emailErr]),
      el('label', null, [document.createTextNode('Details (optional)'), details, detailsErr]),
      btn,
      status,
    ]);

    const lock = (message) => {
      [email, details, btn].forEach((f) => (f.disabled = true));
      status.className = 'ok';
      status.textContent = message;
    };
    if (t.done) {
      email.value = t.email || '';
      lock(t.done);
      return form;
    }

    const showErrors = (data) => {
      const first = (v) => (Array.isArray(v) ? v.join(' ') : v ? String(v) : '');
      emailErr.textContent = first(data.email);
      detailsErr.textContent = first(data.details);
      email.setAttribute('aria-invalid', data.email ? 'true' : 'false');
      const other = Object.keys(data)
        .filter((k) => k !== 'email' && k !== 'details')
        .map((k) => first(data[k]))
        .filter(Boolean)
        .join(' ');
      status.className = 'ferr';
      status.textContent = other;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = email.value.trim();
      if (!value || !email.checkValidity()) {
        showErrors({ email: 'Please enter a valid email address.' });
        email.focus();
        return;
      }
      showErrors({});
      btn.disabled = true;
      const body = { email: value, question: t.question };
      if (details.value.trim()) body.details = details.value.trim();
      if (state.conversationId) body.conversation_id = state.conversationId;
      try {
        const res = await api('/api/public/tickets/', { method: 'POST', body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const message = String(data.message || 'Thanks! Our team will be in touch.');
          t.done = message;
          t.email = value;
          save();
          lock(message);
          return;
        }
        if (res.status === 400 && data && typeof data === 'object') showErrors(data);
        else if (res.status === 429) showErrors({ detail: MSG.rate });
        else if (res.status === 401 || res.status === 403) showErrors({ detail: MSG.setup });
        else showErrors({ detail: MSG.down });
      } catch {
        showErrors({ detail: MSG.down });
      }
      btn.disabled = false;
    });
    return form;
  }

  renderAll();
  return { open, close };
}

// ---- bootstrap --------------------------------------------------------------

(function boot() {
  if (window.AskDesk || window.__askdeskLoading) return; // loaded twice
  window.__askdeskLoading = true;

  const apiKey = currentScript && currentScript.getAttribute('data-api-key');
  if (!apiKey) {
    warn('Missing data-api-key attribute; widget not rendered.');
    return;
  }
  let apiBase;
  try {
    apiBase = new URL(currentScript.getAttribute('data-api-url') || currentScript.src, location.href).origin;
  } catch {
    warn('Could not determine API URL; widget not rendered.');
    return;
  }

  const pending = [];
  window.AskDesk = {
    open: () => pending.push('open'),
    close: () => pending.push('close'),
  };

  const start = async () => {
    try {
      const res = await fetch(apiBase + '/api/public/widget-config/', { headers: { 'X-API-Key': apiKey } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const config = await res.json();
      const widget = createWidget({ apiBase, apiKey, config: config || {} });
      window.AskDesk.open = widget.open;
      window.AskDesk.close = widget.close;
      pending.forEach((a) => widget[a]());
    } catch (err) {
      warn('Failed to load widget config (' + (err && err.message) + '); widget not rendered.');
    }
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
