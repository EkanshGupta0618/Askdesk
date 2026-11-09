const TONES = {
  calm: "bg-calm/10 text-calm",
  signal: "bg-signal/20 text-signal-ink",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-ink/5 text-muted",
};

export default function StatusBadge({ tone = "neutral", pulse = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {pulse && <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}