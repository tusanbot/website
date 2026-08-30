import Link from "next/link";
import ToolsExplorer from "@/components/tools/ToolsExplorer";
import { tools } from "@/lib/tools";

export const metadata = {
    title: "ابزارهای آنلاین توسن | ابزار کاربردی و هوش مصنوعی",
    description: "مجموعه ابزارهای آنلاین توسن برای ساخت فاکتور، تبدیل عکس و PDF به متن، PDF به Word، رزومه‌سازی و ابزارهای هوش مصنوعی.",
    alternates: {
        canonical: "/tools",
    },
};

export default function ToolsPage() {
    const indexableTools = tools.filter((tool) => tool.enabled && tool.indexable && tool.href);

    return (
        <main className="min-h-screen page-background text-[var(--text)]" dir="rtl">
            <section className="mx-auto max-w-7xl px-6 pt-10 md:pt-16 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">ابزارهای آنلاین توسن</h1>
                    <p className="mt-4 text-base leading-8 text-[var(--text-muted)]">
                        مجموعه‌ای از ابزارهای کاربردی و هوش مصنوعی برای کارهای روزمره، خدمات کافی‌نت و آماده‌سازی فایل‌ها؛ سریع، ساده و قابل استفاده آنلاین.
                    </p>
                </div>
                <nav aria-label="ابزارهای منتخب" className="mt-6 flex flex-wrap justify-center gap-2">
                    {indexableTools.map((tool) => (
                        <Link
                            key={tool.id}
                            href={tool.href!}
                            className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--text-muted)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                        >
                            {tool.title}
                        </Link>
                    ))}
                </nav>
            </section>
            <ToolsExplorer />
        </main>
    );
}
