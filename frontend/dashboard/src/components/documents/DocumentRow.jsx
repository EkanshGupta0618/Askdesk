import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import api from "../../api/client";
import { formatDateTime } from "../../utils/format";
import { getErrorMessage } from "../../utils/errors";
import StatusBadge from "../StatusBadge";

const STATUS = {
  processing: { tone: "neutral", label: "Processing", pulse: true },
  ready: { tone: "calm", label: "Ready" },
  failed: { tone: "danger", label: "Failed" },
};

const iconButton =
  "rounded-md p-2 text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-signal";

export default function DocumentRow({ document, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(document.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = STATUS[document.status] ?? STATUS.processing;

  function startEditing() {
    setDraft(document.title);
    setEditing(true);
  }

  async function saveTitle() {
    const title = draft.trim();
    if (!title || title === document.title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.patch(`/documents/${document.id}/`, { title });
      onChange({ ...document, title: data.title });
      setEditing(false);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reprocess() {
    setBusy(true);
    try {
      await api.post(`/documents/${document.id}/reprocess/`);
      onChange({ ...document, status: "processing", error_message: "" });
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed = window.confirm(
      `Delete “${document.title}”? Your assistant will stop using it in answers.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await api.delete(`/documents/${document.id}/`);
      onDelete(document.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-line align-baseline last:border-b-0">
      <td className="py-4 pr-4">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`title-${document.id}`} className="sr-only">
              Document title
            </label>
            <input
              id={`title-${document.id}`}
              value={draft}
              maxLength={255}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditing(false);
              }}
              className="min-w-48 flex-1 rounded-md border border-line bg-white px-2 py-1 focus-visible:outline-2 focus-visible:outline-signal"
            />
            <button type="button" onClick={saveTitle} disabled={busy} className="text-sm font-medium text-ink underline">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted underline">
              Cancel
            </button>
          </div>
        ) : (
          <p className="font-medium text-ink">{document.title}</p>
        )}
        <p className="mt-0.5 text-sm text-muted">{document.file_name}</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {error}
          </p>
        )}
      </td>

      <td className="py-4 pr-4">
        <StatusBadge tone={status.tone} pulse={status.pulse}>
          {status.label}
        </StatusBadge>
        {document.status === "failed" && document.error_message && (
          <p className="mt-1 max-w-xs text-sm text-danger">{document.error_message}</p>
        )}
      </td>

      <td className="py-4 pr-4 text-right text-sm text-muted">
        {document.status === "ready" ? document.chunk_count : "–"}
      </td>

      <td className="py-4 pr-4 text-sm whitespace-nowrap text-muted">{formatDateTime(document.created_at)}</td>

      <td className="py-3 align-top">
        <div className="flex justify-end gap-1">
          <button type="button" onClick={startEditing} disabled={busy || editing} className={iconButton} aria-label={`Rename ${document.title}`} title="Rename">
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={reprocess}
            disabled={busy || document.status === "processing"}
            className={iconButton}
            aria-label={`Re-process ${document.title}`}
            title="Re-process"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={remove} disabled={busy} className={`${iconButton} hover:text-danger`} aria-label={`Delete ${document.title}`} title="Delete">
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}