"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function PageLoader() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 1400);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]"
                >
                    <div className="flex flex-col items-center gap-6">
                        <motion.div
                            animate={{
                                scale: [1, 1.08, 1],
                                rotate: [0, 4, -4, 0],
                            }}
                            transition={{
                                duration: 1.6,
                                repeat: Infinity,
                            }}
                            className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--primary)]/10 text-4xl"
                        >
                            🛡️
                        </motion.div>

                        <div className="text-center">
                            <div className="text-2xl font-black text-[var(--text)]">
                                توسن
                            </div>

                            <div className="mt-1 text-sm text-[var(--text-muted)]">
                                در حال آماده‌سازی تجربه‌ای سریع و امن...
                            </div>
                        </div>

                        <div className="h-1 w-56 overflow-hidden rounded-full bg-[var(--border)]">
                            <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}