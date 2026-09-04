import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/ocr");

export default function OcrLayout({ children }: { children: React.ReactNode }) {
    return children;
}
