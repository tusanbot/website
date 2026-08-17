"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    className?: string;
};

export function StaggerContainer({ children, className }: Props) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.08,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className }: Props) {
    return (
        <motion.div
            variants={{
                hidden: {
                    opacity: 0,
                    y: 20,
                    scale: 0.98,
                },
                visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                },
            }}
            transition={{
                duration: 0.35,
                ease: "easeOut",
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}