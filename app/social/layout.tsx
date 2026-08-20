import type { ReactNode } from "react";
import SocialNavigationGuard from "./SocialNavigationGuard";

export default function SocialLayout({ children }: { children: ReactNode }) {
    return (
        <SocialNavigationGuard>
            <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)]">
                {children}
            </div>
        </SocialNavigationGuard>
    );
}
