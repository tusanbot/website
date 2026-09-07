import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";
import TextActionsEnhancer from "@/components/tools/TextActionsEnhancer";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppLayout><TextActionsEnhancer />{children}</AppLayout>;
}
