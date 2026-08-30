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
    seoTitle?: string;
    seoDescription?: string;
    indexable?: boolean;
};

export const tools: ToolDefinition[] = [
    { id: "invoice-builder", title: "فاکتورساز", description: "ساخت سریع فاکتورهای ساده و قابل چاپ و PDF.", icon: "🧾", category: "general", type: "normal", href: "/tools/invoice", featured: true, enabled: true, seoTitle: "فاکتورساز آنلاین | ساخت و چاپ فاکتور | توسن", seoDescription: "با فاکتورساز آنلاین توسن فاکتور حرفه‌ای بسازید، اطلاعات مشتری و کالا را وارد کنید و خروجی قابل چاپ یا PDF تهیه کنید.", indexable: true },
    { id: "image-pdf-to-text", title: "عکس و PDF به متن", description: "استخراج متن فارسی و انگلیسی از تصویر و فایل PDF، ویرایش و دریافت خروجی TXT یا Word.", icon: "🔎", category: "general", type: "normal", href: "/tools/ocr", featured: true, enabled: true, seoTitle: "تبدیل عکس و PDF به متن آنلاین | OCR فارسی | توسن", seoDescription: "با ابزار آنلاین OCR توسن از تصویر و PDF متن فارسی و انگلیسی استخراج کنید، متن را ویرایش کنید و خروجی بگیرید.", indexable: true },
    { id: "pdf-to-word", title: "PDF به Word", description: "تبدیل فایل PDF متنی به سند Word قابل ویرایش؛ پشتیبانی OCR در مرحله بعد اضافه می‌شود.", icon: "📄", category: "general", type: "normal", href: "/tools/pdf-to-word", featured: true, enabled: true, seoTitle: "تبدیل PDF به Word آنلاین | PDF به DOCX | توسن", seoDescription: "فایل PDF متنی خود را به Word قابل ویرایش تبدیل کنید. ابزار آنلاین توسن برای تبدیل سریع و ساده PDF به DOCX است.", indexable: true },
    { id: "resume-builder", title: "رزومه‌ساز", description: "ساخت رزومه حرفه‌ای با ویرایش زنده، سوابق کاری و تحصیلی، مهارت‌ها و خروجی قابل چاپ.", icon: "📋", category: "general", type: "normal", href: "/tools/resume-builder", featured: true, enabled: true, seoTitle: "رزومه‌ساز آنلاین | ساخت رزومه حرفه‌ای | توسن", seoDescription: "با رزومه‌ساز آنلاین توسن یک رزومه حرفه‌ای بسازید و اطلاعات تحصیلی، مهارت‌ها و سوابق کاری خود را مرتب کنید.", indexable: true },
    { id: "student-council-poster", title: "پوستر انتخابات شورای دانش‌آموزی", description: "ساخت پوستر انتخاباتی مناسب چاپ و اشتراک‌گذاری.", icon: "🗳️", category: "general", type: "normal", href: "/tools/student-council-poster", featured: true, enabled: true, seoTitle: "ساخت پوستر شورای دانش‌آموزی آنلاین | توسن", seoDescription: "برای انتخابات شورای دانش‌آموزی پوستر آماده چاپ و اشتراک‌گذاری بسازید.", indexable: true },
    { id: "weekly-study-plan", title: "برنامه درس هفتگی", description: "ساخت برنامه هفتگی مرتب و قابل چاپ برای دانش‌آموزان.", icon: "📚", category: "general", type: "normal", href: "/tools/weekly-study-plan", featured: true, enabled: true, seoTitle: "برنامه درس هفتگی آنلاین | برنامه‌ریزی مطالعه | توسن", seoDescription: "با ابزار برنامه درس هفتگی توسن یک برنامه مطالعه منظم و قابل چاپ برای روزهای هفته تنظیم کنید.", indexable: true },
    { id: "cybercafe-form-builder", title: "فرم‌ساز کافی‌نت", description: "ساخت پیش‌فرم برای ثبت اطلاعات و آماده‌سازی ثبت‌نام، با فیلدهای شرطی.", icon: "📝", category: "cybercafe", type: "normal", href: "/tools/form-builder", featured: true, enabled: true, seoTitle: "فرم‌ساز آنلاین کافی‌نت | ساخت فرم خدمات | توسن", seoDescription: "با فرم‌ساز توسن پیش‌فرم‌های کاربردی برای خدمات کافی‌نت و ثبت اطلاعات مشتری ایجاد کنید.", indexable: true },
    { id: "ai-profile", title: "پروفایل هوش مصنوعی", description: "ورود و مدیریت پروفایل شخصی Gemini برای استفاده از ابزارهای هوش مصنوعی.", icon: "🔐", category: "general", type: "ai", href: "/tools/ai-profile", featured: true, enabled: true, seoTitle: "پروفایل هوش مصنوعی | مدیریت ابزارهای AI | توسن", seoDescription: "پروفایل و تنظیمات شخصی خود را برای استفاده از ابزارهای هوش مصنوعی توسن مدیریت کنید.", indexable: true },
    { id: "official-letter-ai", title: "تدوین نامه اداری", description: "کمک هوش مصنوعی برای تدوین و بازنویسی نامه‌های اداری.", icon: "✉️", category: "general", type: "ai", href: "/tools/official-letter", featured: true, enabled: true, seoTitle: "تولید نامه اداری با هوش مصنوعی | نامه رسمی | توسن", seoDescription: "با هوش مصنوعی توسن متن نامه‌های اداری رسمی را بر اساس موضوع و اطلاعات مورد نیاز آماده و بازنویسی کنید.", indexable: true },
    { id: "text-to-speech-ai", title: "تبدیل متن به صوت", description: "تبدیل متن فارسی و انگلیسی به صدای طبیعی با کمک Gemini.", icon: "🔊", category: "general", type: "ai", href: "/tools/text-to-speech", featured: true, enabled: true, seoTitle: "تبدیل متن به صوت آنلاین | Text to Speech | توسن", seoDescription: "متن فارسی یا انگلیسی خود را با ابزار آنلاین توسن به فایل صوتی تبدیل کنید.", indexable: true },
    { id: "thesis-idea-ai", title: "ایده پایان‌نامه", description: "کمک برای پیدا کردن و توسعه ایده‌های مناسب پایان‌نامه.", icon: "🎓", category: "general", type: "ai", href: "/tools/thesis-idea", featured: true, enabled: true, seoTitle: "ایده پایان‌نامه با هوش مصنوعی | پیشنهاد موضوع پژوهشی | توسن", seoDescription: "برای پیدا کردن موضوع و توسعه ایده‌های مناسب پایان‌نامه از ابزار هوش مصنوعی توسن کمک بگیرید.", indexable: true },
    { id: "writing-correction-ai", title: "اصلاح نگارش متن", description: "اصلاح نگارشی، روان‌سازی و بهبود متن فارسی.", icon: "✍️", category: "general", type: "ai", href: "/tools/text-corrector", featured: true, enabled: true, seoTitle: "اصلاح نگارش فارسی با هوش مصنوعی | ویراستار آنلاین | توسن", seoDescription: "متن فارسی خود را با ابزار هوش مصنوعی توسن از نظر نگارشی اصلاح و روان‌تر کنید.", indexable: true },
];

export function getTools(category: ToolCategory, type: ToolType) {
    return tools.filter((tool) => tool.category === category && tool.type === type && tool.enabled);
}

export function getFeaturedTools() {
    return tools.filter((tool) => tool.featured && tool.enabled);
}

export function getToolByHref(href: string) {
    return tools.find((tool) => tool.href === href && tool.enabled);
}
