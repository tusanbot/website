import type { ReactNode } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AgeDateInputEnhancer from "@/components/tools/AgeDateInputEnhancer";
import TextActionsEnhancer from "@/components/tools/TextActionsEnhancer";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppLayout><TextActionsEnhancer /><AgeDateInputEnhancer />{children}</AppLayout>;
}
