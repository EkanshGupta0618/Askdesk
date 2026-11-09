import { useCallback, useEffect, useState } from "react";

import api from "../api/client";
import DocumentRow from "../components/documents/DocumentRow";
import UploadPanel from "../components/documents/UploadPanel";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";

const POLL_INTERVAL_MS = 3000;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // First load
  useEffect(() => {
    let cancelled = false;
    api
      .get("/documents/")
      .then(({ data }) => {
        if (!cancelled) setDocuments(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const { data } = await api.get("/documents/");
      setDocuments(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  // While anything is processing, check again every few seconds
  const hasProcessing = documents.some((doc) => doc.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refreshDocuments, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, refreshDocuments]);

  const addDocument = (doc) => setDocuments((current) => [doc, ...current]);
  const updateDocument = (doc) =>
    setDocuments((current) => current.map((item) => (item.id === doc.id ? doc : item)));
  const removeDocument = (id) => setDocuments((current) => current.filter((item) => item.id !== id));

  return (
    <>
      <PageHeader
        title="Documents"
        description="Your assistant answers customers using only what’s in these documents."
      />

      <UploadPanel onUploaded={addDocument} />

      {error && <FormError message={error} />}

      {loading ? (
        <p className="text-muted">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="max-w-prose">
          <h2 className="font-display text-xl font-semibold text-ink">No documents yet</h2>
          <p className="mt-2 text-muted">
            Upload your FAQ or policy PDF above. Once it shows “Ready,” your assistant can answer questions
            about it.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th scope="col" className="pb-3 pr-4 font-medium">Document</th>
                <th scope="col" className="pb-3 pr-4 font-medium">Status</th>
                <th scope="col" className="pb-3 pr-4 text-right font-medium">Sections</th>
                <th scope="col" className="pb-3 pr-4 font-medium">Uploaded</th>
                <th scope="col" className="pb-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <DocumentRow key={doc.id} document={doc} onChange={updateDocument} onDelete={removeDocument} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}