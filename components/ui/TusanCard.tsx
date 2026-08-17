"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

type TusanCardProps = {
    children: ReactNode;
    className?: string;
    hover?: boolean;
};

export default function TusanCard({
    children,
    className = "",
    hover = true,
}: TusanCardProps) {
    return (
        <motion.div
            whileHover={hover ? { y: -3, scale: 1.01 } : undefined}
            transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
            }}
            className={`tusan-card ${className}`}
        >
            {children}
        </motion.div>
    );
}