export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="bg-ink px-8 py-10 text-paper md:flex md:flex-col md:justify-between md:px-12 md:py-14">
        <p className="font-display text-xl font-bold">AskDesk</p>
        <p className="mt-8 max-w-md font-display text-3xl leading-tight font-semibold md:mt-0 md:text-4xl">
          Your assistant answers customers from your own documents, and hands the rest to you.
        </p>
        <p className="mt-6 hidden text-sm text-paper/60 md:block">
          Upload your policies and FAQs. Review every conversation. Follow up on what it couldn’t answer.
        </p>
      </section>

      <section className="flex items-center px-6 py-12 md:px-16">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          <div className="mt-6">{children}</div>
          {footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
        </div>
      </section>
    </div>
  );
}