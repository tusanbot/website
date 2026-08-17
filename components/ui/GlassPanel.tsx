import { ReactNode } from "react";

type GlassPanelProps = {
    children: ReactNode;
    className?: string;
};

export default function GlassPanel({
    children,
    className = "",
}: GlassPanelProps) {
    return (
        <div
            className={`
                tusan-surface
                relative
                overflow-hidden
                ${className}
            `}
        >
            {children}
        </div>
    );
}