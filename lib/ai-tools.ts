export type AiToolCategory = "creative" | "documents" | "education" | "prompting" | "productivity";

export type AiTool = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AiToolCategory;
  href: string;
  featured: boolean;
};

export const aiTools: AiTool[] = [
  { id: "ai-image-studio", title: "ساخت و ویرایش تصویر", description: "ساخت تصویر از متن و ویرایش تصویر مرجع با هوش مصنوعی.", icon: "🎨", category: "creative", href: "/tools/ai-image", featured: true },
  { id: "ai-video-studio", title: "ساخت ویدیو", description: "تولید ویدیوی کوتاه از توضیح متنی با مدل ویدیویی هوش مصنوعی.", icon: "🎬", category: "creative", href: "/tools/ai-video", featured: true },
  { id: "ai-music-studio", title: "ساخت موسیقی", description: "تولید موسیقی در سبک، حال‌وهوا و فضای دلخواه.", icon: "🎵", category: "creative", href: "/tools/ai-music", featured: true },
  { id: "ai-documents", title: "مدیریت اسناد", description: "خلاصه‌سازی، استخراج نکات و پرسش‌وپاسخ روی اسناد و PDF.", icon: "📑", category: "documents", href: "/tools/ai-documents", featured: true },
  { id: "ai-study", title: "آموزش و حل سؤال", description: "حل تشریحی، توضیح درس و کمک برای آزمون و تکالیف.", icon: "🧠", category: "education", href: "/tools/ai-study", featured: true },
  { id: "ai-prompt", title: "پرامپت‌ساز", description: "تبدیل ایده خام به پرامپت حرفه‌ای برای مدل‌های مختلف AI.", icon: "✨", category: "prompting", href: "/tools/ai-prompt", featured: true },
  { id: "official-letter-ai", title: "تدوین نامه اداری", description: "تدوین و بازنویسی نامه‌های رسمی و اداری.", icon: "✉️", category: "productivity", href: "/tools/official-letter", featured: false },
  { id: "text-to-speech-ai", title: "تبدیل متن به صوت", description: "تبدیل متن فارسی و انگلیسی به صدای طبیعی.", icon: "🔊", category: "productivity", href: "/tools/text-to-speech", featured: false },
  { id: "thesis-idea-ai", title: "ایده پایان‌نامه", description: "ایده‌پردازی و توسعه موضوعات پژوهشی.", icon: "🎓", category: "education", href: "/tools/thesis-idea", featured: false },
  { id: "writing-correction-ai", title: "اصلاح نگارش متن", description: "اصلاح نگارشی و روان‌سازی متن فارسی.", icon: "✍️", category: "productivity", href: "/tools/text-corrector", featured: false },
];

export const aiCategoryLabels: Record<AiToolCategory, string> = {
  creative: "تولید محتوا",
  documents: "اسناد و فایل‌ها",
  education: "آموزش و حل سؤال",
  prompting: "پرامپت و دستوردهی",
  productivity: "کار و بهره‌وری",
};
