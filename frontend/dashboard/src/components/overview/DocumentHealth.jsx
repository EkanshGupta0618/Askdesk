import { Link } from "react-router-dom";

import { plural } from "../../utils/format";

const linkClass =
  "underline underline-offset-2 hover:text-ink/80 focus-visible:outline-2 focus-visible:outline-signal";

export default function DocumentHealth({ documents }) {
  if (documents.total === 0) {
    return (
      <p className="text-muted">
        <Link to="/documents" className={`text-ink ${linkClass}`}>
          Upload your first document
        </Link>{" "}
        so your assistant has something to answer from.
      </p>
    );
  }

  return (
    <p className="text-muted">
      <Link to="/documents" className={`text-ink ${linkClass}`}>
        {plural(documents.ready, "document")} ready
        {documents.processing > 0 && `, ${documents.processing} processing`},{" "}
        <span className={documents.failed > 0 ? "font-medium text-danger" : undefined}>{documents.failed} failed</span>
      </Link>
    </p>
  );
}
