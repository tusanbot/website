export type ToolCategory = "general" | "cybercafe";
export type ToolType = "normal" | "ai";

export type ToolDefinition = {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: ToolCategory;
    type: ToolType;
    href?: string;
    featured: boolean;
    enabled: boolean;
};

export const tools: ToolDefinition[] = [
    { id: "invoice-builder", title: "فاکتورساز", description: "ساخت سریع فاکتورهای ساده و قابل چاپ و PDF.", icon: "🧾", category: "general", type: "normal", href: "/tools/invoice", featured: true, enabled: true },
    { id: "image-pdf-to-text", title: "عکس و PDF به متن", description: "استخراج متن فارسی و انگلیسی از تصویر و فایل PDF، ویرایش و دریافت خروجی TXT یا Word.", icon: "🔎", category: "general", type: "normal", href: "/tools/ocr", featured: true, enabled: true },
    { id: "pdf-to-word", title: "PDF به Word", description: "تبدیل فایل PDF به سند Word قابل ویرایش، با OCR خودکار برای صفحات اسکن‌شده.", icon: "📄", category: "general", type: "normal", href: "/tools/pdf-to-word", featured: true, enabled: true },
    { id: "student-council-poster", title: "پوستر انتخابات شورای دانش‌آموزی", description: "ساخت پوستر انتخاباتی مناسب چاپ و اشتراک‌گذاری.", icon: "🗳️", category: "general", type: "normal", href: "/tools/student-council-poster", featured: true, enabled: true },
    { id: "weekly-study-plan", title: "برنامه درس هفتگی", description: "ساخت برنامه هفتگی مرتب و قابل چاپ برای دانش‌آموزان.", icon: "📚", category: "general", type: "normal", href: "/tools/weekly-study-plan", featured: false, enabled: false },
    { id: "cybercafe-form-builder", title: "فرم‌ساز کافی‌نت", description: "ساخت پیش‌فرم برای ثبت اطلاعات و آماده‌سازی ثبت‌نام.", icon: "📝", category: "cybercafe", type: "normal", href: "/tools/form-builder", featured: true, enabled: false },
    { id: "official-letter-ai", title: "تدوین نامه اداری", description: "کمک هوش مصنوعی برای تدوین و بازنویسی نامه‌های اداری.", icon: "✉️", category: "general", type: "ai", href: "/tools/official-letter", featured: true, enabled: false },
    { id: "text-to-speech-ai", title: "تبدیل متن به صوت", description: "تبدیل متن به صدای طبیعی با کمک هوش مصنوعی.", icon: "🔊", category: "general", type: "ai", href: "/tools/text-to-speech", featured: false, enabled: false },
    { id: "thesis-idea-ai", title: "ایده پایان‌نامه", description: "کمک برای پیدا کردن و توسعه ایده‌های مناسب پایان‌نامه.", icon: "🎓", category: "general", type: "ai", href: "/tools/thesis-idea", featured: false, enabled: false },
    { id: "writing-correction-ai", title: "اصلاح نگارش متن", description: "اصلاح نگارشی، روان‌سازی و بهبود متن فارسی.", icon: "✍️", category: "general", type: "ai", href: "/tools/writing-correction", featured: true, enabled: false },
];

export function getTools(category: ToolCategory, type: ToolType) {
    return tools.filter((tool) => tool.category === category && tool.type === type && tool.enabled);
}

export function getFeaturedTools() {
    return tools.filter((tool) => tool.featured && tool.enabled);
}
