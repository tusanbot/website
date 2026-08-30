import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/invoice");

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
    return children;
}
