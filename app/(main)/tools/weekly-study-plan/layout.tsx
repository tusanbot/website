import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/weekly-study-plan");

export default function WeeklyStudyPlanLayout({ children }: { children: React.ReactNode }) {
    return children;
}
