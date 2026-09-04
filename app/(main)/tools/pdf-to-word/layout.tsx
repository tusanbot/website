import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/pdf-to-word");

export default function PdfToWordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
