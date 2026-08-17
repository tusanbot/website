"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    delay?: number;
    className?: string;
};

export default function FadeIn({
    children,
    delay = 0,
    className,
}: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}