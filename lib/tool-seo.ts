import type { Metadata } from "next";
import { getToolByHref } from "@/lib/tools";

const SITE_URL = "https://www.tusancn.ir";

export function getToolMetadata(href: string): Metadata {
    const tool = getToolByHref(href);

    if (!tool) {
        return {
            title: "ابزار آنلاین | کافی نت توسن",
            robots: { index: false, follow: true },
        };
    }

    const canonical = `${SITE_URL}${tool.href}`;
    const indexable = tool.indexable !== false;

    return {
        title: tool.seoTitle || `${tool.title} | کافی نت توسن`,
        description: tool.seoDescription || tool.description,
        alternates: { canonical },
        robots: { index: indexable, follow: true },
        openGraph: {
            title: tool.seoTitle || tool.title,
            description: tool.seoDescription || tool.description,
            url: canonical,
            type: "website",
            siteName: "کافی نت توسن",
            locale: "fa_IR",
        },
    };
}
