// Mirrors Ticket.Status on the server. `selectClass` tints the status dropdown.
export const TICKET_STATUS = {
  open: { tone: "signal", label: "Open", selectClass: "border-signal/50 bg-signal/15 text-signal-ink" },
  in_progress: { tone: "neutral", label: "In progress", selectClass: "border-line bg-ink/5 text-ink" },
  resolved: { tone: "calm", label: "Resolved", selectClass: "border-calm/30 bg-calm/10 text-calm" },
};

export const TICKET_STATUS_VALUES = Object.keys(TICKET_STATUS);
