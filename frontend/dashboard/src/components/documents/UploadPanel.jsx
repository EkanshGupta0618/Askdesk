import { FileUp } from "lucide-react";
import { useRef, useState } from "react";

import api from "../../api/client";
import { getErrorMessage } from "../../utils/errors";
import { Button, FormError, TextField } from "../ui";

const MAX_MB = 10;

export default function UploadPanel({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // null = not uploading
  const [error, setError] = useState("");

  const uploading = progress !== null;

  // Check type and size in the browser first; the server checks again
  function chooseFile(selected) {
    setError("");
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file. Other formats aren’t supported yet.");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`This file is larger than ${MAX_MB} MB. Choose a smaller PDF.`);
      return;
    }
    setFile(selected);
    setTitle(selected.name.replace(/\.pdf$/i, ""));
  }

  function reset() {
    setFile(null);
    setTitle("");
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    const body = new FormData();
    body.append("title", title.trim() || file.name);
    body.append("file", file);

    setError("");
    setProgress(0);
    try {
      const { data } = await api.post("/documents/", body, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onUploaded(data);
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
      setProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-10">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          chooseFile(e.dataTransfer.files[0]);
        }}
        className={`rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-calm bg-calm/5" : "border-line bg-white"
        }`}
      >
        <FileUp size={28} className="mx-auto text-muted" aria-hidden="true" />
        {file ? (
          <p className="mt-3 font-medium text-ink">{file.name}</p>
        ) : (
          <p className="mt-3 text-ink">
            Drag a PDF here, or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-signal"
            >
              choose a file
            </button>
          </p>
        )}
        <p className="mt-1 text-sm text-muted">FAQs, policies, or product guides. PDF up to {MAX_MB} MB.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => chooseFile(e.target.files[0])}
        />
      </div>

      {file && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <TextField
            id="document-title"
            label="Title"
            hint="Customers see this title when an answer cites the document."
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-64 flex-1"
          />
          <div className="flex gap-2 pb-7">
            <Button type="submit" disabled={uploading}>
              {uploading ? `Uploading ${progress}%` : "Upload document"}
            </Button>
            <Button variant="secondary" onClick={reset} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
    </form>
  );
}