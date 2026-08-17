import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";

export default function MainLayout({
    children,
}: {
    children: ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}