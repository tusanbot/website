"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ReactNode } from "react";

type PrimaryLinkButtonProps = {
    href: string;
    children: ReactNode;
    className?: string;
    fullWidth?: boolean;
};

export default function PrimaryLinkButton({
    href,
    children,
    className = "",
    fullWidth = false,
}: PrimaryLinkButtonProps) {
    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={fullWidth ? "w-full" : ""}
        >
            <Link
                href={href}
                className={`
                    btn-primary
                    inline-flex items-center justify-center gap-2
                    px-5 py-3
                    rounded-xl
                    font-bold
                    transition-all duration-200
                    ${fullWidth ? "w-full" : ""}
                    ${className}
                `}
            >
                {children}
            </Link>
        </motion.div>
    );
}