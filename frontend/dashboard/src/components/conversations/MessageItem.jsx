import { formatDateTime, formatSeconds } from "../../utils/format";
import StatusBadge from "../StatusBadge";

export default function MessageItem({ message }) {
  const isCustomer = message.role === "user";
  const unanswered = !isCustomer && message.answered === false;

  return (
    <li
      className={`rounded-lg border px-5 py-4 ${
        isCustomer
          ? "border-line bg-white"
          : unanswered
            ? "border-signal/50 bg-signal/5"
            : "border-transparent bg-ink/[0.03]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{isCustomer ? "Customer" : "Assistant"}</p>
        <div className="flex items-center gap-3 text-sm text-muted">
          {unanswered && <StatusBadge tone="signal">Not answered</StatusBadge>}
          {!isCustomer && message.latency_ms != null && <span>Replied in {formatSeconds(message.latency_ms)}</span>}
          <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
        </div>
      </div>

      <p className="mt-2 max-w-prose whitespace-pre-wrap text-ink">{message.content}</p>

      {message.sources?.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Cited:{" "}
          {message.sources
            .map((source) => `[${source.number}] ${source.document_title}, page ${source.page_number}`)
            .join("; ")}
        </p>
      )}

      {unanswered && (
        <p className="mt-3 text-sm text-signal-ink">
          None of your documents covers this. Add the answer to a document so your assistant can answer it next
          time.
        </p>
      )}
    </li>
  );
}