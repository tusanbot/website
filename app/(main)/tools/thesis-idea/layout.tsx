import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/thesis-idea");

export default function ThesisIdeaLayout({ children }: { children: React.ReactNode }) {
    return children;
}
