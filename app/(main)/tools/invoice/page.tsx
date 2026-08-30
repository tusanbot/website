import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";
import InvoiceToolClient from "./InvoiceToolClient";

export const metadata: Metadata = getToolMetadata("/tools/invoice");

export default function InvoicePage() {
    return <InvoiceToolClient />;
}
