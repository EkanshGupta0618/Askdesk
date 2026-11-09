import { ArrowLeft, Mail, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/client";
import CopyButton from "../components/CopyButton";
import TicketStatusSelect from "../components/tickets/TicketStatusSelect";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";
import { formatDateTime } from "../utils/format";

const linkButton =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export default function TicketDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== id;

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/tickets/${id}/`)
      .then(({ data }) => {
        if (!cancelled) setResult({ key: id, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err.response?.status === 404 ? "This ticket doesn’t exist or belongs to another business." : getErrorMessage(err);
          setResult({ key: id, data: null, error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ticket = result.data;
  const updateTicket = (data) => setResult((current) => ({ ...current, data }));

  return (
    <>
      <Link
        to="/tickets"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All tickets
      </Link>

      {loading ? (
        <p className="text-muted">Loading ticket…</p>
      ) : result.error ? (
        <FormError message={result.error} />
      ) : (
        <TicketDetail ticket={ticket} onChange={updateTicket} />
      )}
    </>
  );
}

function TicketDetail({ ticket, onChange }) {
  const replySubject = encodeURIComponent(`Re: ${ticket.question.slice(0, 80)}`);

  return (
    <>
      <PageHeader
        title={`Ticket #${ticket.id}`}
        description={`Received ${formatDateTime(ticket.created_at)}`}
        actions={
          <>
            {ticket.conversation && (
              <Link
                to={`/conversations/${ticket.conversation}`}
                className={`${linkButton} border border-line bg-white text-ink hover:bg-paper`}
              >
                <MessagesSquare size={16} aria-hidden="true" />
                View conversation
              </Link>
            )}
            <a
              href={`mailto:${ticket.customer_email}?subject=${replySubject}`}
              className={`${linkButton} bg-ink text-paper hover:bg-ink/90`}
            >
              <Mail size={16} aria-hidden="true" />
              Reply by email
            </a>
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <section aria-labelledby="ticket-question" className="min-w-0">
          <h2 id="ticket-question" className="text-sm font-medium text-muted">
            Question
          </h2>
          <p className="mt-2 max-w-prose text-lg whitespace-pre-wrap text-ink">{ticket.question}</p>

          <h2 className="mt-8 text-sm font-medium text-muted">Details from the customer</h2>
          {ticket.details ? (
            <p className="mt-2 max-w-prose whitespace-pre-wrap text-ink">{ticket.details}</p>
          ) : (
            <p className="mt-2 text-muted">The customer didn’t add any details.</p>
          )}
        </section>

        <aside className="space-y-6 lg:border-l lg:border-line lg:pl-6">
          <div>
            <TicketStatusSelect ticket={ticket} onChange={onChange} id="ticket-status" showLabel />
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-muted">Customer</dt>
              <dd className="mt-0.5 text-ink">{ticket.customer_name || "No name given"}</dd>
              <dd className="mt-0.5 flex items-center gap-1">
                <a
                  href={`mailto:${ticket.customer_email}`}
                  className="min-w-0 break-all text-ink underline hover:text-ink/80 focus-visible:outline-2 focus-visible:outline-signal"
                >
                  {ticket.customer_email}
                </a>
                <CopyButton text={ticket.customer_email} label="Copy email" />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Last updated</dt>
              <dd className="mt-0.5 text-ink">{formatDateTime(ticket.updated_at)}</dd>
            </div>
            {ticket.resolved_at && (
              <div>
                <dt className="font-medium text-muted">Resolved</dt>
                <dd className="mt-0.5 text-ink">{formatDateTime(ticket.resolved_at)}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </>
  );
}
