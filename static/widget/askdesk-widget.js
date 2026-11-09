(function(){var e={rate:`You're sending messages quickly. Please wait a moment and try again.`,down:`The assistant is unavailable right now. Please try again.`,setup:`This chat isn't set up correctly.`},t=document.currentScript;function n(e){console.warn(`[AskDesk] `+e)}function r(e,t,n){let r=document.createElement(e);if(t)for(let e in t){let n=t[e];n!=null&&n!==!1&&(e===`class`?r.className=n:e===`text`?r.textContent=n:e.startsWith(`on`)?r.addEventListener(e.slice(2),n):r.setAttribute(e,n===!0?``:n))}return n&&n.forEach(e=>e&&r.appendChild(e)),r}function i(){let e=`http://www.w3.org/2000/svg`,t=document.createElementNS(e,`svg`);t.setAttribute(`viewBox`,`0 0 24 24`),t.setAttribute(`aria-hidden`,`true`),t.setAttribute(`focusable`,`false`);let n=document.createElementNS(e,`path`);return n.setAttribute(`d`,`M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.4L4 21.5V18a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z`),t.appendChild(n),t}function a(e){let t=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(e||``).trim());if(!t)return null;let n=t[1];return n.length===3&&(n=n.replace(/./g,`$&$&`)),[0,2,4].map(e=>parseInt(n.slice(e,e+2),16))}function o(e){let[t,n,r]=e.map(e=>(e/=255,e<=.03928?e/12.92:((e+.055)/1.055)**2.4));return .2126*t+.7152*n+.0722*r}function s(e){let t=o(e);return 1.05/(t+.05)>=(t+.05)/.05?`#ffffff`:`#111111`}async function c(e,t){let n=e.getReader(),r=new TextDecoder,i=``,a=e=>{let n=`message`,r=[];if(e.split(`
`).forEach(e=>{e.startsWith(`event:`)?n=e.slice(6).trim():e.startsWith(`data:`)&&r.push(e.slice(5).replace(/^ /,``))}),!r.length)return;let i;try{i=JSON.parse(r.join(`
`))}catch{return}t(n,i)};for(;;){let{value:e,done:t}=await n.read();if(t)break;i+=r.decode(e,{stream:!0}).replace(/\r\n?/g,`
`);let o;for(;(o=i.indexOf(`

`))!==-1;)a(i.slice(0,o)),i=i.slice(o+2)}i+=r.decode(),i.trim()&&a(i)}function l(e){return String(e||``).replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g,``).replace(/\s*\[[\d,\s]*$/,``).trim()}function u(e){let t=new Set,n=[];return(e||[]).forEach(e=>{if(!e||!e.document_title)return;let r=`Source: `+e.document_title+(e.page_number==null?``:`, page `+e.page_number);t.has(r)||(t.add(r),n.push(r))}),n}function d({apiBase:t,apiKey:n,config:o}){let d=`askdesk:`+n,f=a(o.color)||a(`#2563eb`),p=`#`+f.map(e=>e.toString(16).padStart(2,`0`)).join(``),m=String(o.business_name||`Support`),h=String(o.greeting||`Hi! How can I help you today?`),g=y(),_=!1,v=!1;function y(){try{let e=sessionStorage.getItem(d),t=e&&JSON.parse(e);if(t&&Array.isArray(t.messages))return t}catch{}return{conversationId:null,messages:[]}}function b(){try{sessionStorage.setItem(d,JSON.stringify(g))}catch{}}function x(e,r={}){return fetch(t+e,{...r,headers:{"X-API-Key":n,"Content-Type":`application/json`,...r.headers||{}}})}let S=r(`div`,{id:`askdesk-widget-root`});S.style.setProperty(`--ad-brand`,p),S.style.setProperty(`--ad-on-brand`,s(f));let C=S.attachShadow({mode:`open`});C.appendChild(r(`style`,{text:`
:host {
  all: initial;
  --ad-brand: #2563eb;
  --ad-on-brand: #ffffff;
  --ad-text: #1f2328;
  --ad-muted: #57606a;
  --ad-border: #d0d7de;
  --ad-bg: #ffffff;
  --ad-bubble: #f3f4f6;
  --ad-error: #b42318;
  position: fixed;
  z-index: 2147483000;
  bottom: 0;
  right: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.45;
  color: var(--ad-text);
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
button, input, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .6; }
:focus-visible { outline: 3px solid var(--ad-brand); outline-offset: 2px; }

.launcher {
  position: fixed; right: 20px; bottom: 20px;
  width: 56px; height: 56px; border-radius: 50%; border: 0;
  background: var(--ad-brand); color: var(--ad-on-brand);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.25);
  transition: transform .15s ease;
}
.launcher:hover { transform: scale(1.06); }
.launcher svg { width: 28px; height: 28px; fill: currentColor; }
.launcher:focus-visible { outline-color: var(--ad-text); }

.panel {
  position: fixed; right: 20px; bottom: 88px;
  width: 380px; height: 560px; max-height: calc(100vh - 108px);
  background: var(--ad-bg); border-radius: 14px; overflow: hidden;
  display: flex; flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
  animation: ad-in .18s ease-out;
}
@keyframes ad-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

.header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 12px 12px 16px;
  background: var(--ad-brand); color: var(--ad-on-brand);
}
.title { flex: 1; margin: 0; font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hbtn {
  background: transparent; border: 1px solid currentColor; color: inherit;
  border-radius: 6px; padding: 4px 8px; font-size: 13px;
}
.hbtn.close { border: 0; font-size: 22px; line-height: 1; padding: 2px 8px; }
.header :focus-visible { outline-color: var(--ad-on-brand); }

.messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: 85%; padding: 9px 12px; border-radius: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.msg.user { align-self: flex-end; background: var(--ad-brand); color: var(--ad-on-brand); border-bottom-right-radius: 4px; }
.msg.bot { align-self: flex-start; background: var(--ad-bubble); border-bottom-left-radius: 4px; }
.msg.error { align-self: stretch; max-width: none; background: #fef3f2; color: var(--ad-error); border: 1px solid #fecdca; }
.sources { margin: 6px 0 0; padding: 0; list-style: none; font-size: 13px; color: var(--ad-muted); }
.retry { margin-top: 6px; display: block; background: var(--ad-bg); border: 1px solid currentColor; color: var(--ad-error); border-radius: 6px; padding: 3px 10px; font-size: 13px; }

.typing { display: inline-flex; gap: 4px; padding: 4px 0; }
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--ad-muted); animation: ad-dot 1s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes ad-dot { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }

.ticket { align-self: stretch; border: 1px solid var(--ad-border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ticket p { margin: 0; font-size: 14px; }
.ticket label { font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 4px; }
.ticket input, .ticket textarea { border: 1px solid var(--ad-border); border-radius: 8px; padding: 7px 9px; font-weight: 400; background: var(--ad-bg); }
.ticket textarea { resize: vertical; min-height: 60px; }
.ferr { color: var(--ad-error); font-size: 12px; font-weight: 400; }
.ticket .ok { color: #067647; }
.primary { background: var(--ad-brand); color: var(--ad-on-brand); border: 0; border-radius: 8px; padding: 8px 12px; font-weight: 600; }

.composer { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--ad-border); align-items: flex-end; }
.composer textarea {
  flex: 1; resize: none; border: 1px solid var(--ad-border); border-radius: 10px;
  padding: 8px 10px; max-height: 120px; min-height: 40px; background: var(--ad-bg);
}
.composer .primary { height: 40px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (max-width: 479px) {
  .panel { inset: 0; width: 100%; height: 100%; max-height: none; border-radius: 0; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`}));let w=r(`button`,{class:`launcher`,type:`button`,"aria-label":`Open chat with `+m,"aria-expanded":`false`,"aria-controls":`askdesk-panel`,onclick:()=>v?L():I()});w.appendChild(i());let T=`askdesk-title`,E=r(`button`,{class:`hbtn`,type:`button`,text:`Start a new chat`,onclick:R}),D=r(`button`,{class:`hbtn close`,type:`button`,"aria-label":`Close chat`,text:`×`,onclick:L}),O=r(`div`,{class:`messages`,role:`log`,"aria-live":`polite`,"aria-relevant":`additions text`}),k=r(`textarea`,{rows:`1`,maxlength:`1000`,placeholder:`Type your question…`,"aria-label":`Your question`}),A=r(`button`,{class:`primary`,type:`submit`,text:`Send`}),j=r(`form`,{class:`composer`,onsubmit:e=>{e.preventDefault(),W()}},[k,A]),M=r(`div`,{class:`panel`,id:`askdesk-panel`,role:`dialog`,"aria-modal":`false`,"aria-labelledby":T,hidden:!0},[r(`div`,{class:`header`},[r(`h2`,{class:`title`,id:T,text:m}),E,D]),O,j]);M.addEventListener(`keydown`,e=>{e.key===`Escape`&&(e.stopPropagation(),L())}),k.addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&!e.isComposing&&(e.preventDefault(),W())}),k.addEventListener(`input`,N),C.appendChild(M),C.appendChild(w),document.body.appendChild(S);function N(){k.style.height=`auto`,k.style.height=Math.min(k.scrollHeight,120)+`px`}function P(){O.scrollTop=O.scrollHeight}function F(e){_=e,k.disabled=e,A.disabled=e,E.disabled=e,O.setAttribute(`aria-busy`,e?`true`:`false`),!e&&v&&k.focus()}function I(){v||(v=!0,M.hidden=!1,w.setAttribute(`aria-expanded`,`true`),w.setAttribute(`aria-label`,`Close chat`),P(),k.focus())}function L(){v&&(v=!1,M.hidden=!0,w.setAttribute(`aria-expanded`,`false`),w.setAttribute(`aria-label`,`Open chat with `+m),w.focus())}function R(){_||(g={conversationId:null,messages:[]},b(),H(),k.focus())}function z(e,t){return r(`div`,{class:`msg `+e,text:t})}function B(e){let t=z(`bot`,l(e.text)),n=u(e.sources);return n.length&&t.appendChild(r(`ul`,{class:`sources`},n.map(e=>r(`li`,{text:e})))),t}function V(e){if(e.role===`user`)return[z(`user`,e.text)];if(e.role===`error`)return[U(e)];let t=[B(e)];return e.ticket&&t.push(K(e)),t}function H(){O.textContent=``,O.appendChild(z(`bot`,h)),g.messages.forEach(e=>V(e).forEach(e=>O.appendChild(e))),P()}function U(e){let t=z(`error`,e.text);return t.setAttribute(`role`,`alert`),e.retry&&t.appendChild(r(`button`,{class:`retry`,type:`button`,text:`Retry`,onclick:()=>{if(_)return;let n=g.messages.indexOf(e);n!==-1&&g.messages.splice(n,1),b(),t.remove(),G(e.retry)}})),t}function W(){if(_)return;let e=k.value.trim().slice(0,1e3);e&&(k.value=``,N(),g.messages.push({role:`user`,text:e}),b(),O.appendChild(z(`user`,e)),P(),G(e))}async function G(t){F(!0);let n=z(`bot`,``),i=r(`span`,{class:`typing`,"aria-label":`Assistant is typing`,role:`status`},[r(`span`),r(`span`),r(`span`)]);n.appendChild(i),O.appendChild(n),P();let a=null,o=``,s=!1,u=null;try{let r=await x(`/api/chat/ask/stream/`,{method:`POST`,headers:{Accept:`text/event-stream`},body:JSON.stringify({question:t,conversation_id:g.conversationId||null})});if(!r.ok||!r.body){try{let e=await r.json();e&&e.conversation_id&&(g.conversationId=e.conversation_id,b())}catch{}u=r.status===429?{text:e.rate}:r.status===401||r.status===403?{text:e.setup}:{text:e.down,retry:!0}}else await c(r.body,(r,c)=>{if(!s){if(r===`start`)c.conversation_id&&(g.conversationId=c.conversation_id,b());else if(r===`token`)a||(i.remove(),a=document.createTextNode(``),n.appendChild(a)),o+=c.text||``,a.data=l(o),P();else if(r===`done`){s=!0,c.conversation_id&&(g.conversationId=c.conversation_id);let e={role:`bot`,text:String(c.answer||``),sources:c.sources||[]};c.answered===!1&&(e.ticket={question:t}),g.messages.push(e),b();let r=V(e);n.replaceWith(r[0]),r.slice(1).forEach(e=>O.appendChild(e)),P()}else r===`error`&&(s=!0,u={text:e.down,retry:!0})}}),s||(u={text:e.down,retry:!0})}catch{u={text:e.down,retry:!0}}if(u){n.remove();let e={role:`error`,text:u.text};u.retry&&(e.retry=t),g.messages.push(e),b(),O.appendChild(U(e)),P()}F(!1)}function K(t){let n=t.ticket,i=Math.random().toString(36).slice(2,8),a=r(`input`,{type:`email`,required:!0,autocomplete:`email`,name:`email`,id:`ad-email-`+i}),o=r(`textarea`,{name:`details`,rows:`3`,maxlength:`2000`,id:`ad-details-`+i}),s=r(`span`,{class:`ferr`,id:`ad-email-err-`+i}),c=r(`span`,{class:`ferr`,id:`ad-details-err-`+i});a.setAttribute(`aria-describedby`,s.id),o.setAttribute(`aria-describedby`,c.id);let l=r(`p`,{role:`status`}),u=r(`button`,{class:`primary`,type:`submit`,text:`Send to support`}),d=r(`form`,{class:`ticket`,novalidate:!0,"aria-label":`Contact support`},[r(`p`,{text:`I couldn't find an answer. Leave your email and our team will follow up.`}),r(`label`,null,[document.createTextNode(`Email`),a,s]),r(`label`,null,[document.createTextNode(`Details (optional)`),o,c]),u,l]),f=e=>{[a,o,u].forEach(e=>e.disabled=!0),l.className=`ok`,l.textContent=e};if(n.done)return a.value=n.email||``,f(n.done),d;let p=e=>{let t=e=>Array.isArray(e)?e.join(` `):e?String(e):``;s.textContent=t(e.email),c.textContent=t(e.details),a.setAttribute(`aria-invalid`,e.email?`true`:`false`);let n=Object.keys(e).filter(e=>e!==`email`&&e!==`details`).map(n=>t(e[n])).filter(Boolean).join(` `);l.className=`ferr`,l.textContent=n};return d.addEventListener(`submit`,async t=>{t.preventDefault();let r=a.value.trim();if(!r||!a.checkValidity()){p({email:`Please enter a valid email address.`}),a.focus();return}p({}),u.disabled=!0;let i={email:r,question:n.question};o.value.trim()&&(i.details=o.value.trim()),g.conversationId&&(i.conversation_id=g.conversationId);try{let t=await x(`/api/public/tickets/`,{method:`POST`,body:JSON.stringify(i)}),a=await t.json().catch(()=>({}));if(t.ok){let e=String(a.message||`Thanks! Our team will be in touch.`);n.done=e,n.email=r,b(),f(e);return}t.status===400&&a&&typeof a==`object`?p(a):t.status===429?p({detail:e.rate}):t.status===401||t.status===403?p({detail:e.setup}):p({detail:e.down})}catch{p({detail:e.down})}u.disabled=!1}),d}return H(),{open:I,close:L}}(function(){if(window.AskDesk||window.__askdeskLoading)return;window.__askdeskLoading=!0;let e=t&&t.getAttribute(`data-api-key`);if(!e){n(`Missing data-api-key attribute; widget not rendered.`);return}let r;try{r=new URL(t.getAttribute(`data-api-url`)||t.src,location.href).origin}catch{n(`Could not determine API URL; widget not rendered.`);return}let i=[];window.AskDesk={open:()=>i.push(`open`),close:()=>i.push(`close`)};let a=async()=>{try{let t=await fetch(r+`/api/public/widget-config/`,{headers:{"X-API-Key":e}});if(!t.ok)throw Error(`HTTP `+t.status);let n=await t.json(),a=d({apiBase:r,apiKey:e,config:n||{}});window.AskDesk.open=a.open,window.AskDesk.close=a.close,i.forEach(e=>a[e]())}catch(e){n(`Failed to load widget config (`+(e&&e.message)+`); widget not rendered.`)}};document.body?a():document.addEventListener(`DOMContentLoaded`,a,{once:!0})})()})();