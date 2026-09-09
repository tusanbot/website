export default function OrdersLoading() {
  return (
    <div dir="rtl" className="min-h-screen page-background text-[var(--text)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-pulse">
        <div className="h-16 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-12 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
