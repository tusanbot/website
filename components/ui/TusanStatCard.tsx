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
                boxShadow: "0 18px 40px rgba(6,95,80,0.28)",
            }}
            transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
            }}
            className={`                 relative overflow-hidden
                rounded-3xl
                border border-white/15
                bg-white/10
                backdrop-blur-xl
                before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/12 before:via-transparent before:to-transparent before:pointer-events-none
                px-5 py-4
                text-white
                shadow-[0_10px_24px_rgba(6,95,80,0.18)]
                ${className}
            `}
        > <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />


            {icon && (
                <div className="relative z-10 mb-2">
                    {typeof icon === "string"
                        ? renderIcon(icon)
                        : icon}
                </div>
            )}

            <div className="relative z-10 text-sm text-white/75">
                {title}
            </div>

            <div className="relative z-10 mt-1 text-2xl font-black text-white">
                {value}
            </div>
        </motion.div>
    );


}

function renderIcon(icon: string) {
    const cls = "text-[var(--primary)]";

    switch (icon) {
        // امنیت / برند
        case "🛡️":
            return <TusanIcon name="shield" size={28} className={cls} />;

        // داشبورد / سفارش‌ها
        case "📋":
            return <TusanIcon name="clipboard" size={28} className={cls} />;
        case "🔎":
        case "🔍":
            return <TusanIcon name="search" size={28} className={cls} />;
        case "⚙️":
            return <TusanIcon name="cog" size={28} className={cls} />;
        case "✅":
            return <TusanIcon name="check" size={28} className={cls} />;
        case "📊":
            return <TusanIcon name="chart" size={28} className={cls} />;
        case "📈":
            return <TusanIcon name="chart" size={28} className={cls} />;
        case "📉":
            return <TusanIcon name="chart" size={28} className={cls} />;

        // کاربران / پیام‌ها
        case "👥":
            return <TusanIcon name="users" size={28} className={cls} />;
        case "💬":
        case "📨":
            return <TusanIcon name="message" size={28} className={cls} />;
        case "🔔":
            return <TusanIcon name="bell" size={28} className={cls} />;
        case "👤":
            return <TusanIcon name="user" size={28} className={cls} />;

        // خدمات
        case "📝":
            return <TusanIcon name="file" size={28} className={cls} />;
        case "🎓":
            return <TusanIcon name="graduation" size={28} className={cls} />;
        case "🚗":
            return <TusanIcon name="car" size={28} className={cls} />;
        case "🧾":
            return <TusanIcon name="receipt" size={28} className={cls} />;
        case "🧩":
            return <TusanIcon name="briefcase" size={28} className={cls} />;
        case "📂":
            return <TusanIcon name="briefcase" size={28} className={cls} />;
        case "📄":
            return <TusanIcon name="file" size={28} className={cls} />;

        // ویژگی‌ها
        case "⚡":
            return <TusanIcon name="zap" size={28} className={cls} />;
        case "🔒":
            return <TusanIcon name="lock" size={28} className={cls} />;
        case "📱":
        case "🖥️":
            return <TusanIcon name="monitor" size={28} className={cls} />;
        case "🎧":
            return <TusanIcon name="support" size={28} className={cls} />;

        // فرآیند
        case "📤":
            return <TusanIcon name="upload" size={28} className={cls} />;
        case "⚙":
            return <TusanIcon name="cog" size={28} className={cls} />;

        // مکان / تماس
        case "📍":
            return <TusanIcon name="map" size={28} className={cls} />;
        case "📞":
            return <TusanIcon name="phone" size={28} className={cls} />;
        case "📨":
            return <TusanIcon name="message" size={28} className={cls} />;

        case "💬":
            return <TusanIcon name="chat" size={28} className={cls} />;

        // خانه / ناوبری
        case "🏠":
            return <TusanIcon name="home" size={28} className={cls} />;
        case "➡️":
            return <TusanIcon name="arrowRight" size={28} className={cls} />;
        case "⬅️":
            return <TusanIcon name="arrowLeft" size={28} className={cls} />;

        default:
            return <TusanIcon name="briefcase" size={28} className={cls} />;
    }
}
