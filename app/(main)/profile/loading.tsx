export default function ProfileLoading() {
  return (
    <div dir="rtl" className="min-h-screen page-background text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-pulse">
        <div className="h-14 w-48 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-72 rounded-3xl bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
