import ToolsExplorer from "@/components/tools/ToolsExplorer";

export const metadata = {
    title: "ابزارهای آنلاین توسن | ابزار کاربردی و هوش مصنوعی",
    description: "مجموعه ابزارهای آنلاین توسن برای ساخت فاکتور، تبدیل عکس و PDF به متن، PDF به Word، رزومه‌سازی و ابزارهای هوش مصنوعی.",
    alternates: {
        canonical: "/tools",
    },
};

export default function ToolsPage() {
    return (
        <main className="min-h-screen page-background text-[var(--text)]">
            <h1 className="sr-only">ابزارهای آنلاین توسن</h1>
            <ToolsExplorer />
        </main>
    );
}
