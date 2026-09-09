export default function ServicesLoading() {
  return (
    <div dir="rtl" className="min-h-screen page-background text-[var(--text)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5 animate-pulse">
        <div className="h-40 rounded-[28px] bg-[var(--surface-muted)]" />
        <div className="h-14 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
