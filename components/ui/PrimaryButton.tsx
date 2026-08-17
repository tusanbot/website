"use client";

import Link from "next/link";
import TusanButton from "./TusanButton";

type Props = {
    href?: string;
    children: React.ReactNode;
    className?: string;
    fullWidth?: boolean;
    onClick?: () => void;
    disabled?: boolean;
};

export default function PrimaryButton({
    href,
    children,
    className = "",
    fullWidth = false,
    onClick,
    disabled,
}: Props) {
    if (href) {
        return (
            <Link href={href} className={fullWidth ? "w-full" : ""}>
                <TusanButton
                    variant="primary"
                    fullWidth={fullWidth}
                    className={className}
                    disabled={disabled}
                >
                    {children}
                </TusanButton>
            </Link>
        );
    }

    return (
        <TusanButton
            variant="primary"
            fullWidth={fullWidth}
            className={className}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </TusanButton>
    );
}