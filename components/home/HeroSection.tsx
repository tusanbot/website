import Link from "next/link";
import FloatingBackground from "./FloatingBackground";
import { TusanButton } from "@/components/ui";

export default function HeroSection() {
    return (
        <section className="relative min-h-screen overflow-hidden">
            <div className="absolute inset-0 hero-background-motion">
                <FloatingBackground />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-24 lg:px-8">
                <div className="grid w-full items-center gap-14 lg:grid-cols-2">
                    <div className="text-center lg:text-right hero-content-enter">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm backdrop-blur hero-item-enter">
                            <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse" />
                            خدمات آنلاین کافی‌نت توسن
                        </div>

                        <h1 className="mt-6 text-5xl font-black leading-tight text-[var(--text)] sm:text-6xl lg:text-7xl hero-item-enter hero-item-delay-1">
                            تمام خدمات کافی‌نت،
                            <span className="block bg-gradient-to-l from-[var(--primary)] via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                                آنلاین و بدون مراجعه حضوری
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)] lg:mx-0 hero-item-enter hero-item-delay-2">
                            ثبت‌نام‌های اینترنتی، خدمات دانشجویی، بیمه، مالیات، خودرو و ده‌ها
                            خدمت دیگر را سریع، امن و قابل پیگیری در توسن انجام دهید.
                        </p>

                        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start hero-item-enter hero-item-delay-3">
                            <Link href="/services">
                                <TusanButton className="w-full sm:w-auto px-8 py-3 text-base">
                                    ثبت سفارش
                                </TusanButton>
                            </Link>

                            <Link href="/orders">
                                <TusanButton variant="secondary" className="w-full sm:w-auto px-8 py-3 text-base">
                                    پیگیری سفارش
                                </TusanButton>
                            </Link>
                        </div>

                        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-[var(--text-muted)] lg:justify-start hero-item-enter hero-item-delay-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                ثبت سفارش در کمتر از ۲ دقیقه
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                پیگیری آنلاین وضعیت سفارش
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--primary)]">✔</span>
                                پشتیبانی سریع و امن
                            </div>
                        </div>
                    </div>

                    <div className="relative hidden lg:block hero-card-enter">
                        <div className="absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--primary)]/18 blur-3xl" />

                        <div className="relative rounded-[32px] border border-white/10 bg-[var(--surface)]/85 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="text-sm font-bold text-[var(--text-muted)]">پنل سفارش توسن</div>
                                <div className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">آنلاین</div>
                            </div>

                            <div className="space-y-4">
                                <FloatingItem icon="🎓" title="ثبت‌نام دانشگاه" subtitle="در حال انجام" />
                                <FloatingItem icon="📄" title="اظهارنامه مالیاتی" subtitle="آماده تحویل" />
                                <FloatingItem icon="🚗" title="خدمات خودرو" subtitle="در حال بررسی" />
                                <FloatingItem icon="🛡️" title="خدمات بیمه" subtitle="ثبت‌شده" />
                            </div>

                            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">سفارش‌های امروز</span>
                                    <span className="text-2xl font-black text-[var(--text)]">۱۲۸</span>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[var(--primary)] to-emerald-400 hero-progress" />
                                </div>
                                <div className="mt-2 text-xs text-[var(--text-muted)]">۷۸٪ ظرفیت پردازش امروز تکمیل شده است.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 hero-scroll-indicator">
                <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <span className="text-xs">اسکرول کنید</span>
                    <div className="flex h-10 w-6 justify-center rounded-full border border-[var(--border)]">
                        <div className="mt-2 h-2 w-2 rounded-full bg-[var(--primary)]" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes heroEnter {
                    from { opacity: 0; transform: translate3d(0, 22px, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                @keyframes heroCardEnter {
                    from { opacity: 0; transform: translate3d(28px, 0, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                @keyframes heroProgress {
                    from { width: 0; }
                    to { width: 78%; }
                }
                @keyframes heroScroll {
                    0%, 100% { opacity: .45; transform: translate3d(-50%, 0, 0); }
                    50% { opacity: 1; transform: translate3d(-50%, -6px, 0); }
                }
                .hero-item-enter { animation: heroEnter .65s ease-out both; }
                .hero-item-delay-1 { animation-delay: .15s; }
                .hero-item-delay-2 { animation-delay: .3s; }
                .hero-item-delay-3 { animation-delay: .45s; }
                .hero-item-delay-4 { animation-delay: .6s; }
                .hero-card-enter { animation: heroCardEnter .75s ease-out .2s both; }
                .hero-progress { animation: heroProgress 1.2s ease-out .8s both; }
                .hero-scroll-indicator { animation: heroScroll 1.2s ease-in-out 1s infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .hero-item-enter, .hero-card-enter, .hero-progress, .hero-scroll-indicator { animation: none; }
                }
            `}</style>
        </section>
    );
}

function FloatingItem({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02]">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-2xl">{icon}</div>
                <div>
                    <div className="font-bold text-[var(--text)]">{title}</div>
                    <div className="text-sm text-[var(--text-muted)]">{subtitle}</div>
                </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.8)]" />
        </div>
    );
}
