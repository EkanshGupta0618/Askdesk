import { Link } from "react-router-dom";

import { formatDateTime, plural } from "../../utils/format";

const linkClass =
  "text-sm font-medium whitespace-nowrap text-ink underline underline-offset-2 hover:text-ink/80 focus-visible:outline-2 focus-visible:outline-signal";

export default function UnansweredList({ items }) {
  return (
    <section aria-labelledby="unanswered-questions" className="mb-12">
      <h2 id="unanswered-questions" className="font-display text-xl font-semibold text-ink">
        Questions your assistant couldn’t answer
      </h2>

      {items.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted">Your assistant answered every question in this period.</p>
      ) : (
        <>
          <p className="mt-2 max-w-prose text-muted">
            Add these answers to one of your{" "}
            <Link to="/documents" className="text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-signal">
              documents
            </Link>{" "}
            and your assistant can answer them next time.
          </p>
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li
                key={item.conversation_id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{item.question}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Asked {item.count === 1 ? "once" : plural(item.count, "time")}, last on{" "}
                    {formatDateTime(item.last_asked_at)}
                  </p>
                </div>
                <Link to={`/conversations/${item.conversation_id}`} className={linkClass}>
                  View conversation
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
