import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDate, plural } from "../../utils/format";
import usePrefersReducedMotion from "./usePrefersReducedMotion";

const SERIES = [
  { key: "answered", label: "Answered", color: "var(--color-calm)" },
  { key: "unanswered", label: "Not answered", color: "var(--color-signal)" },
];

const axisTick = { fill: "var(--color-muted)", fontSize: 12 };
const TOP_RADIUS = [4, 4, 0, 0];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-ink">{day.label}</p>
      <p className="text-muted">{plural(day.questions, "question")}</p>
      {SERIES.map((series) => (
        <p key={series.key} className="flex items-center gap-2 text-ink">
          <span className="size-2.5 rounded-sm" style={{ background: series.color }} aria-hidden="true" />
          {series.label}: {day[series.key]}
        </p>
      ))}
    </div>
  );
}

function summarize(data, total, unanswered) {
  const busiest = data.reduce((best, day) => (day.questions > best.questions ? day : best), data[0]);
  return `${plural(total, "question")}, ${unanswered} unanswered, busiest day ${busiest.label} with ${plural(
    busiest.questions,
    "question",
  )}.`;
}

export default function QuestionsChart({ daily, total, unanswered }) {
  const reducedMotion = usePrefersReducedMotion();

  const data = daily.map((day) => ({
    ...day,
    label: formatDate(day.date),
    answered: Math.max(day.questions - day.unanswered, 0),
  }));

  return (
    <section aria-labelledby="questions-per-day" className="mb-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="questions-per-day" className="font-display text-xl font-semibold text-ink">
          Questions per day
        </h2>
        <ul className="flex gap-4 text-sm text-muted">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: series.color }} aria-hidden="true" />
              {series.label}
            </li>
          ))}
        </ul>
      </div>

      <figure>
        <div className="h-64" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: "var(--color-line)" }}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--color-ink)", fillOpacity: 0.05 }}
                isAnimationActive={!reducedMotion}
              />
              <Bar dataKey="answered" stackId="questions" fill="var(--color-calm)" isAnimationActive={!reducedMotion}>
                {/* Round the top of the bar only when nothing is stacked on it */}
                {data.map((day) => (
                  <Cell key={day.date} radius={day.unanswered > 0 ? 0 : TOP_RADIUS} />
                ))}
              </Bar>
              <Bar
                dataKey="unanswered"
                stackId="questions"
                fill="var(--color-signal)"
                radius={TOP_RADIUS}
                isAnimationActive={!reducedMotion}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="mt-3 text-sm text-muted">{summarize(data, total, unanswered)}</figcaption>
      </figure>
    </section>
  );
}
