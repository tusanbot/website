import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/text-corrector");

export default function TextCorrectorLayout({ children }: { children: React.ReactNode }) {
    return children;
}
