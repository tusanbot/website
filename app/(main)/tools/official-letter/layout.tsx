import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/official-letter");

export default function OfficialLetterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
