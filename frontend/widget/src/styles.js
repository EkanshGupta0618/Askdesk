export const CSS = `
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
`;
