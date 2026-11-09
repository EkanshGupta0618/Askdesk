import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import api from "../api/client";
import CopyButton from "../components/CopyButton";
import FilterTabs from "../components/FilterTabs";
import Pagination from "../components/Pagination";
import TicketStatusSelect from "../components/tickets/TicketStatusSelect";
import { TICKET_STATUS, TICKET_STATUS_VALUES } from "../components/tickets/ticketStatus";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";
import { formatDateTime } from "../utils/format";

const PAGE_SIZE = 20; // matches TicketPagination on the server

const FILTERS = [
  { value: "all", label: "All" },
  ...TICKET_STATUS_VALUES.map((value) => ({ value, label: TICKET_STATUS[value].label })),
];

const EMPTY_STATE = {
  all: {
    title: "No tickets yet",
    body: "When your assistant can’t answer a question, customers can leave their email. Those requests show up here.",
  },
  open: { title: "No open tickets", body: "Every customer request has been picked up. Nice work." },
  in_progress: { title: "Nothing in progress", body: "Tickets you’re working on show up here." },
  resolved: { title: "No resolved tickets", body: "Tickets you mark as resolved show up here." },
};

export default function TicketsPage() {
  // Filter and page live in the URL, so refresh and back/forward keep your place
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const statusParam = searchParams.get("status");
  const filter = TICKET_STATUS_VALUES.includes(statusParam) ? statusParam : "all";

  const requestKey = `${filter}:${page}`;
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const params = { page };
    if (filter !== "all") params.status = filter;

    api
      .get("/tickets/", { params })
      .then(({ data }) => {
        if (!cancelled) setResult({ key: requestKey, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, data: null, error: getErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [filter, page, requestKey]);

  function changeFilter(value) {
    setSearchParams(value === "all" ? {} : { status: value });
  }

  function changePage(value) {
    const next = { page: String(value) };
    if (filter !== "all") next.status = filter;
    setSearchParams(next);
  }

  // Keep the row in place after a status change, even if it no longer matches the filter,
  // so it doesn't vanish from under the cursor
  function updateTicket(ticket) {
    setResult((current) => ({
      ...current,
      data: {
        ...current.data,
        results: current.data.results.map((item) => (item.id === ticket.id ? ticket : item)),
      },
    }));
  }

  const tickets = result.data?.results ?? [];
  const empty = EMPTY_STATE[filter];

  return (
    <>
      <PageHeader
        title="Tickets"
        description="Customers who needed more help than your assistant could give. Reply to them by email."
      />

      <FilterTabs label="Show tickets" options={FILTERS} value={filter} onChange={changeFilter} />

      {result.error && <FormError message={result.error} />}

      {loading ? (
        <p className="text-muted">Loading tickets…</p>
      ) : tickets.length === 0 && !result.error ? (
        <div className="max-w-prose">
          <h2 className="font-display text-xl font-semibold text-ink">{empty.title}</h2>
          <p className="mt-2 text-muted">{empty.body}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th scope="col" className="pb-3 pr-4 font-medium">Question</th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Customer</th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Status</th>
                  <th scope="col" className="pb-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  return (
                    <tr key={ticket.id} className="border-b border-line align-baseline last:border-b-0">
                      <td className="py-4 pr-4">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="line-clamp-2 font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-signal"
                        >
                          {ticket.question}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted">#{ticket.id}</p>
                      </td>
                      <td className="py-4 pr-4">
                        {ticket.customer_name && <p className="text-sm text-ink">{ticket.customer_name}</p>}
                        <div className="flex items-center gap-1">
                          <a
                            href={`mailto:${ticket.customer_email}`}
                            className="min-w-0 text-sm break-all text-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-signal"
                          >
                            {ticket.customer_email}
                          </a>
                          <CopyButton text={ticket.customer_email} label={`Copy email ${ticket.customer_email}`} />
                        </div>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <TicketStatusSelect ticket={ticket} onChange={updateTicket} />
                      </td>
                      <td className="py-4 text-sm whitespace-nowrap text-muted">{formatDateTime(ticket.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} count={result.data?.count ?? 0} onChange={changePage} />
        </>
      )}
    </>
  );
}
