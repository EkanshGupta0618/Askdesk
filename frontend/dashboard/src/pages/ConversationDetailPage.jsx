import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api/client";
import MessageItem from "../components/conversations/MessageItem";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";
import { formatDateTime, plural } from "../utils/format";

export default function ConversationDetailPage() {
  const { id } = useParams();
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== id;

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/chat/conversations/${id}/`)
      .then(({ data }) => {
        if (!cancelled) setResult({ key: id, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err.response?.status === 404 ? "This conversation doesn’t exist or belongs to another business." : getErrorMessage(err);
          setResult({ key: id, data: null, error: message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const conversation = result.data;

  return (
    <>
      <Link
        to="/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All conversations
      </Link>

      {loading ? (
        <p className="text-muted">Loading conversation…</p>
      ) : result.error ? (
        <FormError message={result.error} />
      ) : (
        <>
          <PageHeader
            title="Conversation"
            description={`Started ${formatDateTime(conversation.created_at)}. ${plural(
              conversation.question_count,
              "question",
            )}, ${conversation.unanswered_count} unanswered.`}
          />
          <ol className="space-y-3">
            {conversation.messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}