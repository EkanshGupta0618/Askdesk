const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const BUTTON_VARIANTS = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-line bg-white text-ink hover:bg-paper",
  danger: "border border-danger/30 bg-white text-danger hover:bg-danger/5",
};

export function Button({ variant = "primary", className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${focusRing} ${className}`}
      {...props}
    />
  );
}

export function TextField({ label, id, error, hint, className = "", ...props }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`mt-1.5 block w-full rounded-md border bg-white px-3 py-2 text-ink placeholder:text-muted/60 ${error ? "border-danger" : "border-line"} ${focusRing}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-prose text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}