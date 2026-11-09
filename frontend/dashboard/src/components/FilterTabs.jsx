export default function FilterTabs({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="mb-6 inline-flex rounded-md border border-line bg-white p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-signal ${
              active ? "bg-ink font-medium text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}