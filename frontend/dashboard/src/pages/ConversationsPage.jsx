import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import api from "../api/client";
import FilterTabs from "../components/FilterTabs";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";
import { formatDateTime, plural } from "../utils/format";

const PAGE_SIZE = 20; // matches ConversationPagination on the server

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unanswered", label: "Unanswered" },
];

export default function ConversationsPage() {
  // Filter and page live in the URL, so refresh and back/forward keep your place
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const filter = searchParams.get("filter") === "unanswered" ? "unanswered" : "all";

  const requestKey = `${filter}:${page}`;
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const params = { page };
    if (filter === "unanswered") params.unanswered = "true";

    api
      .get("/chat/conversations/", { params })
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
    setSearchParams(value === "unanswered" ? { filter: value } : {});
  }

  function changePage(value) {
    const next = { page: String(value) };
    if (filter === "unanswered") next.filter = filter;
    setSearchParams(next);
  }

  const conversations = result.data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every question customers asked your assistant, and what it answered."
      />

      <FilterTabs label="Show conversations" options={FILTERS} value={filter} onChange={changeFilter} />

      {result.error && <FormError message={result.error} />}

      {loading ? (
        <p className="text-muted">Loading conversations…</p>
      ) : conversations.length === 0 && !result.error ? (
        <div className="max-w-prose">
          {filter === "unanswered" ? (
            <>
              <h2 className="font-display text-xl font-semibold text-ink">No unanswered questions</h2>
              <p className="mt-2 text-muted">
                When your assistant can’t answer something, the conversation shows up here, so you can add the
                missing information to your documents.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold text-ink">No conversations yet</h2>
              <p className="mt-2 text-muted">
                Once customers start chatting with your assistant, every conversation appears here.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th scope="col" className="pb-3 pr-4 font-medium">First question</th>
                  <th scope="col" className="pb-3 pr-8 text-right font-medium">Questions</th>
                  <th scope="col" className="pb-3 pr-4 font-medium">Answers</th>
                  <th scope="col" className="pb-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr key={conversation.id} className="border-b border-line align-baseline last:border-b-0">
                    <td className="py-4 pr-4">
                      <Link
                        to={`/conversations/${conversation.id}`}
                        className="line-clamp-2 font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-signal"
                      >
                        {conversation.first_question || "Conversation without questions"}
                      </Link>
                    </td>
                    <td className="py-4 pr-8 text-right text-sm text-muted">{conversation.question_count}</td>
                    <td className="py-4 pr-4">
                      {conversation.unanswered_count > 0 ? (
                        <StatusBadge tone="signal">{plural(conversation.unanswered_count, "unanswered", "unanswered")}</StatusBadge>
                      ) : (
                        <StatusBadge tone="calm">All answered</StatusBadge>
                      )}
                    </td>
                    <td className="py-4 text-sm whitespace-nowrap text-muted">
                      {formatDateTime(conversation.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} count={result.data?.count ?? 0} onChange={changePage} />
        </>
      )}
    </>
  );
}