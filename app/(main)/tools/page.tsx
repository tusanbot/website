import ToolsExplorer from "@/components/tools/ToolsExplorer";

export const metadata = {
    title: "ابزارهای توسن",
    description: "ابزارهای کاربردی و هوش مصنوعی توسن برای کاربران و کافی‌نت‌ها.",
};

export default function ToolsPage() {
    return (
        <main className="min-h-screen page-background text-[var(--text)]">
            <ToolsExplorer />
        </main>
    );
}
