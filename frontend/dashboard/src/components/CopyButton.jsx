import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Small icon button that copies text, e.g. for owners without an email app set up
export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={`inline-flex shrink-0 items-center rounded p-1 align-middle transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-signal ${
        copied ? "text-calm" : "text-muted hover:text-ink"
      }`}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
