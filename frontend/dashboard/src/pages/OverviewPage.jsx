import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import api from "../api/client";
import FilterTabs from "../components/FilterTabs";
import DocumentHealth from "../components/overview/DocumentHealth";
import KeyFigures from "../components/overview/KeyFigures";
import QuestionsChart from "../components/overview/QuestionsChart";
import UnansweredList from "../components/overview/UnansweredList";
import { FormError, PageHeader } from "../components/ui";
import { getErrorMessage } from "../utils/errors";

const DEFAULT_DAYS = 30;

const PERIODS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

export default function OverviewPage() {
  // The period lives in the URL, so refresh and back/forward keep it
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get("days"));
  const days = PERIODS.some((period) => period.value === requested) ? requested : DEFAULT_DAYS;

  const requestKey = String(days);
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    api
      .get("/analytics/overview/", { params: { days } })
      .then(({ data }) => {
        if (!cancelled) setResult({ key: requestKey, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key: requestKey, data: null, error: getErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [days, requestKey]);

  function changeDays(value) {
    setSearchParams(value === DEFAULT_DAYS ? {} : { days: String(value) });
  }

  const data = result.data;

  return (
    <>
      <PageHeader title="Overview" description="How your assistant is helping customers, at a glance." />

      <FilterTabs label="Time period" options={PERIODS} value={days} onChange={changeDays} />

      {loading ? (
        <p className="text-muted">Loading overview…</p>
      ) : result.error ? (
        <FormError message={result.error} />
      ) : (
        <>
          <KeyFigures data={data} />

          {data.questions === 0 ? (
            <section className="mb-12 max-w-prose">
              <h2 className="font-display text-xl font-semibold text-ink">No questions in this period</h2>
              <p className="mt-2 text-muted">
                Your numbers appear here once customers start chatting with your assistant. Add the chat widget
                to your website with the API key from Settings.
              </p>
            </section>
          ) : (
            <>
              <QuestionsChart daily={data.daily} total={data.questions} unanswered={data.unanswered} />
              <UnansweredList items={data.top_unanswered} />
            </>
          )}

          <section aria-labelledby="document-health">
            <h2 id="document-health" className="mb-2 font-display text-xl font-semibold text-ink">
              Documents
            </h2>
            <DocumentHealth documents={data.documents} />
          </section>
        </>
      )}
    </>
  );
}
