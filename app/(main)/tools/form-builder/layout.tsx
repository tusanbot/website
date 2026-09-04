import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/form-builder");

export default function FormBuilderLayout({ children }: { children: React.ReactNode }) {
    return children;
}
