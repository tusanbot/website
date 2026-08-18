import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function SocialLayout({ children }: { children: ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
