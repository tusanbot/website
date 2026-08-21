import type { ReactNode } from "react";
import SocialNavigationGuard from "./SocialNavigationGuard";
import SocialPricingDisplay from "./SocialPricingDisplay";
import HomeFooter from "@/components/home/HomeFooter";

export default function SocialLayout({ children }: { children: ReactNode }) {
    return (
        <SocialNavigationGuard>
            <div dir="rtl" className="min-h-screen bg-[var(--background)] text-[var(--text)]">
                {children}
                <HomeFooter />
                <SocialPricingDisplay />
            </div>
        </SocialNavigationGuard>
    );
}
