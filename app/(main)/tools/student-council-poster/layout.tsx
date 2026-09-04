import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/student-council-poster");

export default function StudentCouncilPosterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
