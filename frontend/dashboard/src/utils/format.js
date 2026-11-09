const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : "";
}

export function formatSeconds(milliseconds) {
  return milliseconds == null ? "" : `${(milliseconds / 1000).toFixed(1)} s`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
// 0.873 -> "87%"
export function formatPercent(rate) {
  return rate == null ? "" : `${Math.round(rate * 100)}%`;
}

const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

// "2026-11-07" or an ISO date-time -> "Nov 7". Plain dates are read as local days, not UTC.
export function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(year, month - 1, day) : new Date(value);
  return shortDateFormat.format(date);
}

// (112, 100, 30) -> "Up 12% from the previous 30 days"; null when there's nothing to compare with
export function formatChange(current, previous, days) {
  if (!previous) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const period = `the previous ${days} days`;
  if (change === 0) return `Same as ${period}`;
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(change)}% from ${period}`;
}
