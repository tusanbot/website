"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { ReactNode } from "react";

type Props = {
    children: ReactNode;
    className?: string;
};

export default function TiltCard({ children, className = "" }: Props) {
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);

    const springX = useSpring(rotateX, {
        stiffness: 180,
        damping: 18,
    });

    const springY = useSpring(rotateY, {
        stiffness: 180,
        damping: 18,
    });

    function handleMouseMove(
        e: React.MouseEvent<HTMLDivElement>
    ) {
        const rect =
            e.currentTarget.getBoundingClientRect();

        const x =
            e.clientX - rect.left;

        const y =
            e.clientY - rect.top;

        const centerX =
            rect.width / 2;

        const centerY =
            rect.height / 2;

        rotateY.set(
            ((x - centerX) / centerX) * 4
        );

        rotateX.set(
            -((y - centerY) / centerY) * 4
        );
    }

    function handleMouseLeave() {
        rotateX.set(0);
        rotateY.set(0);
    }

    return (
        <motion.div
            className={className}
            style={{
                rotateX: springX,
                rotateY: springY,
                transformPerspective: 1200,
            }}
            whileHover={{
                scale: 1.015,
            }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 16,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {children}
        </motion.div>
    );
}