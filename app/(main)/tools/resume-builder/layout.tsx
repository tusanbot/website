import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/resume-builder");

export default function ResumeBuilderLayout({ children }: { children: React.ReactNode }) {
    return children;
}
