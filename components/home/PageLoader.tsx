export default function PageLoader() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)] motion-safe:animate-[tusan-loader-out_1.2s_ease-out_forwards]"
        >
            <div className="flex flex-col items-center gap-6 motion-safe:animate-[tusan-loader-content-out_0.9s_ease-out_0.25s_forwards]">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-4xl motion-safe:animate-[tusan-loader-pulse_1.2s_ease-in-out_infinite]">
                    🛡️
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-[var(--text)]">توسن</div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">در حال آماده‌سازی تجربه‌ای سریع و امن...</div>
                </div>
                <div className="h-1 w-56 overflow-hidden rounded-full bg-[var(--border)]">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent motion-safe:animate-[tusan-loader-bar_1s_ease-in-out_infinite]" />
                </div>
            </div>
        </div>
    );
}
