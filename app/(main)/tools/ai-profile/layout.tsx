import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/ai-profile");

export default function AiProfileLayout({ children }: { children: React.ReactNode }) {
    return children;
}
