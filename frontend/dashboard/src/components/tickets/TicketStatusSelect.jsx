import { useState } from "react";

import api from "../../api/client";
import { getErrorMessage } from "../../utils/errors";
import { TICKET_STATUS, TICKET_STATUS_VALUES } from "./ticketStatus";

// Changes a ticket's status right away and hands the updated ticket back
export default function TicketStatusSelect({ ticket, onChange, id = `status-${ticket.id}`, showLabel = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function changeStatus(event) {
    const status = event.target.value;
    if (status === ticket.status) return;
    setBusy(true);
    try {
      const { data } = await api.patch(`/tickets/${ticket.id}/`, { status });
      onChange(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const tint = (TICKET_STATUS[ticket.status] ?? TICKET_STATUS.open).selectClass;

  return (
    <div>
      <label htmlFor={id} className={showLabel ? "mb-1.5 block text-sm font-medium text-ink" : "sr-only"}>
        Ticket status
      </label>
      <select
        id={id}
        value={ticket.status}
        disabled={busy}
        onChange={changeStatus}
        className={`cursor-pointer rounded-md border px-2.5 py-1 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-signal ${tint}`}
      >
        {TICKET_STATUS_VALUES.map((value) => (
          <option key={value} value={value} className="bg-white font-normal text-ink">
            {TICKET_STATUS[value].label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
