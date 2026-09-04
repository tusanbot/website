import type { Metadata } from "next";
import { getToolMetadata } from "@/lib/tool-seo";

export const metadata: Metadata = getToolMetadata("/tools/text-to-speech");

export default function TextToSpeechLayout({ children }: { children: React.ReactNode }) {
    return children;
}
