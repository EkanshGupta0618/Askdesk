import { Link } from "react-router-dom";

import { formatChange, formatPercent, formatSeconds, plural } from "../../utils/format";

function Figure({ label, value, valueClass = "text-ink", children }) {
  return (
    <div className="flex-1 py-4 md:px-6 md:py-1 md:first:pl-0 md:last:pr-0">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className={`mt-1 font-display text-3xl font-bold tracking-tight ${valueClass}`}>{value}</dd>
      {children && <dd className="mt-1 text-sm text-muted">{children}</dd>}
    </div>
  );
}

const linkClass =
  "underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal";

export default function KeyFigures({ data }) {
  const days = data.period.days;
  const change = formatChange(data.questions, data.previous_questions, days);
  const hasOpenTickets = data.open_tickets > 0;

  return (
    <dl className="mb-10 flex flex-col divide-y divide-line border-b border-line pb-6 md:flex-row md:divide-x md:divide-y-0">
      <Figure label="Questions" value={data.questions.toLocaleString()}>
        {change ?? `From ${plural(data.conversations, "conversation")}`}
      </Figure>

      <Figure label="Answer rate" value={data.answer_rate == null ? "–" : formatPercent(data.answer_rate)}>
        {data.answer_rate == null ? "No answers yet" : `${plural(data.unanswered, "question")} not answered`}
      </Figure>

      <Figure label="Average response time" value={data.avg_latency_ms == null ? "–" : formatSeconds(data.avg_latency_ms)}>
        {data.p90_latency_ms != null && `9 in 10 replies within ${formatSeconds(data.p90_latency_ms)}`}
      </Figure>

      <Figure
        label="Open tickets"
        value={data.open_tickets.toLocaleString()}
        valueClass={hasOpenTickets ? "text-signal-ink" : "text-ink"}
      >
        {hasOpenTickets ? (
          <Link to="/tickets?status=open" className={linkClass}>
            See open tickets
          </Link>
        ) : (
          "No customers waiting"
        )}
      </Figure>
    </dl>
  );
}
