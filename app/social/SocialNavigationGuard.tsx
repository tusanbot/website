"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, ReactNode } from "react";

export default function SocialNavigationGuard({ children }: { children: ReactNode }) {
    const router = useRouter();

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        const target = event.target as HTMLElement | null;
        const link = target?.closest("a") as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute("href");
        if (href !== "/orders") return;

        event.preventDefault();
        router.push("/social/orders");
    }

    return <div onClickCapture={handleClick}>{children}</div>;
}
