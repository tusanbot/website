"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";
import TusanIcon from "@/components/ui/TusanIcon";

type TusanStatCardProps = {
    title: string;
    value: ReactNode;
    icon?: string | ReactNode;
    className?: string;
};

export default function TusanStatCard({
    title,
    value,
    icon,
    className = "",
}: TusanStatCardProps) {
    return (
        <motion.div
            whileHover={{
                y: -4,
                scale: 1.03,
                boxShadow: "0 18px 40px rgba(6,95,80,0.20)",
            }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className={`relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4 text-[var(--text)] shadow-[0_10px_24px_rgba(6,95,80,0.10)] transition-colors
                ${className}`}
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--primary)]/[0.06] via-transparent to-transparent" />

            {icon && (
                <div className="relative z-10 mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary-dark)]">
                    {typeof icon === "string" ? renderIcon(icon) : icon}
                </div>
            )}

            <div className="relative z-10 text-sm font-semibold text-[var(--text-secondary)]">
                {title}
            </div>

            <div className="relative z-10 mt-1 text-2xl font-black text-[var(--text-primary)]">
                {value}
            </div>
        </motion.div>
    );
}

function renderIcon(icon: string) {
    const cls = "text-[var(--primary-dark)]";

    switch (icon) {
        case "🛡️": return <TusanIcon name="shield" size={26} className={cls} />;
        case "📋": return <TusanIcon name="clipboard" size={26} className={cls} />;
        case "🔎":
        case "🔍": return <TusanIcon name="search" size={26} className={cls} />;
        case "⚙️":
        case "⚙": return <TusanIcon name="cog" size={26} className={cls} />;
        case "✅": return <TusanIcon name="check" size={26} className={cls} />;
        case "📊":
        case "📈":
        case "📉": return <TusanIcon name="chart" size={26} className={cls} />;
        case "👥": return <TusanIcon name="users" size={26} className={cls} />;
        case "💬":
        case "📨": return <TusanIcon name="message" size={26} className={cls} />;
        case "🔔": return <TusanIcon name="bell" size={26} className={cls} />;
        case "👤": return <TusanIcon name="user" size={26} className={cls} />;
        case "📝": return <TusanIcon name="file" size={26} className={cls} />;
        case "🎓": return <TusanIcon name="graduation" size={26} className={cls} />;
        case "🚗": return <TusanIcon name="car" size={26} className={cls} />;
        case "🧾": return <TusanIcon name="receipt" size={26} className={cls} />;
        case "🧩":
        case "📂": return <TusanIcon name="briefcase" size={26} className={cls} />;
        case "📄": return <TusanIcon name="file" size={26} className={cls} />;
        case "⚡": return <TusanIcon name="zap" size={26} className={cls} />;
        case "🔒": return <TusanIcon name="lock" size={26} className={cls} />;
        case "📱":
        case "🖥️": return <TusanIcon name="monitor" size={26} className={cls} />;
        case "🎧": return <TusanIcon name="support" size={26} className={cls} />;
        case "📤": return <TusanIcon name="upload" size={26} className={cls} />;
        case "📍": return <TusanIcon name="map" size={26} className={cls} />;
        case "📞": return <TusanIcon name="phone" size={26} className={cls} />;
        case "🏠": return <TusanIcon name="home" size={26} className={cls} />;
        case "➡️": return <TusanIcon name="arrowRight" size={26} className={cls} />;
        case "⬅️": return <TusanIcon name="arrowLeft" size={26} className={cls} />;
        default: return <TusanIcon name="briefcase" size={26} className={cls} />;
    }
}
