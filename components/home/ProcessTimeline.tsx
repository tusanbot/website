"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/ui";

const steps = [
    {
        icon: "📝",
        title: "انتخاب خدمت",
        description:
            "از میان خدمات کافی‌نت، خدمت موردنظر خود را انتخاب کنید و وارد فرم ثبت سفارش شوید.",
    },
    {
        icon: "📤",
        title: "ثبت اطلاعات",
        description:
            "اطلاعات و مدارک موردنیاز را به‌صورت آنلاین ارسال کنید و سفارش خود را ثبت نمایید.",
    },
    {
        icon: "🔍",
        title: "بررسی توسط توسن",
        description:
            "کارشناسان توسن اطلاعات شما را بررسی کرده و در صورت نیاز با شما ارتباط می‌گیرند.",
    },
    {
        icon: "⚙️",
        title: "انجام خدمت",
        description:
            "خدمت موردنظر با سرعت و دقت بالا انجام می‌شود و وضعیت آن از طریق پنل قابل پیگیری است.",
    },
    {
        icon: "✅",
        title: "تحویل نهایی",
        description:
            "نتیجه نهایی خدمت آماده شده و از طریق پنل کاربری یا روش توافق‌شده در اختیار شما قرار می‌گیرد.",
    },
];

export default function ProcessTimeline() {
    return (
        <section className="relative py-24 overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
                <SectionHeader
                    title="روند انجام سفارش در توسن"
                    description="از انتخاب خدمت تا تحویل نهایی، همه مراحل به‌صورت آنلاین، شفاف و قابل پیگیری انجام می‌شود."
                    align="center"
                />

                <div className="relative mt-16">
                    {/* Vertical rail */}
                    <div className="absolute right-6 top-0 h-full w-px bg-[var(--border)] md:left-1/2 md:right-auto md:-translate-x-1/2" />

                    {/* Animated light */}
                    <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: "100%" }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 1.4, ease: "easeOut" }}
                        className="absolute right-6 top-0 w-px bg-gradient-to-b from-[var(--primary)] via-emerald-400 to-transparent shadow-[0_0_18px_rgba(9,150,124,0.8)] md:left-1/2 md:right-auto md:-translate-x-1/2"
                    />

                    <div className="space-y-10">
                        {steps.map((step, index) => {
                            const left = index % 2 === 0;

                            return (
                                <motion.div
                                    key={step.title}
                                    initial={{ opacity: 0, y: 26 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.25 }}
                                    transition={{
                                        duration: 0.5,
                                        delay: index * 0.08,
                                    }}
                                    className="relative grid md:grid-cols-2 md:gap-16"
                                >
                                    {/* Timeline node */}
                                    <div className="absolute right-[14px] top-8 md:left-1/2 md:right-auto md:-translate-x-1/2">
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] ring-4 ring-[var(--background)]">
                                            <div className="h-3 w-3 rounded-full bg-[var(--primary)] shadow-[0_0_14px_rgba(9,150,124,0.9)]" />
                                        </div>
                                    </div>

                                    {/* Left card */}
                                    <div
                                        className={`pr-16 md:pr-0 ${left
                                                ? "md:col-start-1 md:text-right"
                                                : "md:col-start-1 md:opacity-0"
                                            }`}
                                    >
                                        {left && <TimelineCard step={step} index={index} />}
                                    </div>

                                    {/* Right card */}
                                    <div
                                        className={`pr-16 md:pr-0 ${left
                                                ? "md:col-start-2 md:opacity-0"
                                                : "md:col-start-2 md:text-right"
                                            }`}
                                    >
                                        {!left && <TimelineCard step={step} index={index} />}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function TimelineCard({
    step,
    index,
}: {
    step: (typeof steps)[number];
    index: number;
}) {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.2 }}
            className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/85 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        >
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-[var(--primary)]/12 blur-3xl" />
            </div>

            <div className="relative z-10 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-3xl">
                    {step.icon}
                </div>

                <div>
                    <div className="inline-flex items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                        مرحله {(index + 1).toLocaleString("fa-IR")}
                    </div>

                    <h3 className="mt-3 text-xl font-black text-[var(--text)]">
                        {step.title}
                    </h3>

                    <p className="mt-3 leading-7 text-[var(--text-muted)]">
                        {step.description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}