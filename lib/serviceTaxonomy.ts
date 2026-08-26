export type ServiceTaxonomy = { slug: string; title: string; description: string; aliases: string[] };

export const SERVICE_TAXONOMY: ServiceTaxonomy[] = [
  { slug: 'government', title: 'خدمات دولتی و اداری', description: 'خدمات عمومی و اداری در سامانه‌های دولتی.', aliases: ['خدمات دولتی و اداری', 'خدمات دولتی و انتظامی', 'ثبت احوال و هویت', 'سخا و خدمات انتظامی', 'پلیس+10', 'نظام وظیفه'] },
  { slug: 'tax', title: 'خدمات مالیاتی', description: 'خدمات مرتبط با امور مالیاتی و مؤدیان.', aliases: ['مالیات', 'خدمات مالیاتی'] },
  { slug: 'social-security', title: 'خدمات تأمین اجتماعی', description: 'خدمات مربوط به بیمه‌شدگان و امور تأمین اجتماعی.', aliases: ['تأمین اجتماعی', 'خدمات تأمین اجتماعی', 'تأمین اجتماعی و کار'] },
  { slug: 'vehicle', title: 'خدمات خودرو', description: 'خدمات اینترنتی و اداری مرتبط با خودرو.', aliases: ['خدمات خودرو'] },
  { slug: 'real-estate', title: 'خدمات املاک و مسکن', description: 'خدمات املاک، اجاره، قرارداد و سامانه‌های مسکن.', aliases: ['خدمات املاک', 'خدمات املاک و اسکان', 'خدمات اجاره و قرارداد', 'املاک و مستغلات', 'مسکن و تسهیلات'] },
  { slug: 'education', title: 'خدمات آموزشی و دانشگاهی', description: 'ثبت‌نام، پیگیری و خدمات سامانه‌های آموزشی.', aliases: ['آزمون و سنجش', 'خدمات آموزشی و دانشگاهی', 'خدمات دانشجویی', 'دانشگاهی', 'آموزشی و دانشگاهی', 'آموزش و پرورش', 'سازمان سنجش', 'آزمون و استخدام'] },
  { slug: 'legal', title: 'خدمات قضایی و حقوقی', description: 'خدمات مرتبط با قوه قضائیه و امور حقوقی.', aliases: ['خدمات قضایی', 'خدمات قضایی و ثبت‌نام‌ها', 'قوه قضائیه و دادگاه', 'خدمات شغلی و حقوقی'] },
  { slug: 'banking', title: 'خدمات بانکی و مالی', description: 'خدمات بانکی، اعتباری، مالی و تسهیلات.', aliases: ['بانکی و اعتباری', 'مالی و اعتباری', 'خدمات بانکی و مالی', 'خدمات بانکی و ارزی', 'بانکی', 'خدمات مالی و سرمایه‌گذاری', 'تسهیلات و وام'] },
  { slug: 'business', title: 'خدمات کسب‌وکار و اصناف', description: 'خدمات مجوز، اصناف و امور کسب‌وکار.', aliases: ['خدمات کسب‌وکار', 'کسب‌وکار', 'اصناف', 'اصناف و انتظامی', 'اصناف و بهداشت', 'خدمات مجوز', 'مجوزها و اصناف'] },
  { slug: 'documents', title: 'خدمات مدارک و چاپ', description: 'خدمات آماده‌سازی، چاپ و خروجی مدارک و اسناد.', aliases: ['خدمات مدارک', 'خدمات عکس و مدارک', 'خدمات چاپ و خروجی', 'خدمات چاپ دانشگاهی', 'فایل و اسناد', 'pdf و ورد'] },
  { slug: 'office', title: 'خدمات آفیس و داده', description: 'خدمات Word، Excel، ورود اطلاعات و فایل.', aliases: ['خدمات فایل و کامپیوتر', 'خدمات داده و ورود اطلاعات', 'تایپ و خدمات متنی', 'تایپ و متن', 'خدمات Word', 'خدمات Excel', 'آفیس', 'اطلاعات و داده ها', 'ویرایش متن'] },
  { slug: 'graphic', title: 'خدمات طراحی و گرافیک', description: 'خدمات طراحی گرافیکی، تصویر و شبکه‌های اجتماعی.', aliases: ['طراحی گرافیکی', 'طراحی شبکه اجتماعی', 'ویرایش عکس', 'گرافیک'] },
  { slug: 'web', title: 'خدمات وب و فنی', description: 'خدمات وب، دامنه، برنامه‌نویسی و امور فنی.', aliases: ['خدمات دامنه و سایت', 'خدمات وب', 'وب', 'خدمات برنامه‌نویسی و فنی', 'خدمات فنی', 'خدمات نرم‌افزاری'] },
  { slug: 'research', title: 'خدمات مقاله و پژوهش', description: 'خدمات پژوهشی، مقاله و آماده‌سازی محتوای علمی.', aliases: ['مقاله و پژوهش', 'پژوهش', 'تحقیق و پژوهش'] },
  { slug: 'travel', title: 'خدمات سفر و کنسولی', description: 'خدمات سفر، گذرنامه، کنسولی و زیارتی.', aliases: ['خدمات سفر و کنسولی', 'خدمات سفر و گردشگری', 'خدمات زیارتی و سفر', 'خدمات گذرنامه'] },
  { slug: 'insurance', title: 'خدمات بیمه', description: 'خدمات مربوط به بیمه و استعلام‌های بیمه‌ای.', aliases: ['خدمات بیمه', 'بیمه'] },
  { slug: 'welfare', title: 'خدمات یارانه و رفاهی', description: 'خدمات مرتبط با یارانه و امور رفاهی.', aliases: ['یارانه'] },
  { slug: 'ai', title: 'خدمات هوش مصنوعی', description: 'خدمات کاربردی هوش مصنوعی برای کاربران.', aliases: ['خدمات هوش مصنوعی'] },
];

const byAlias = new Map(SERVICE_TAXONOMY.flatMap((item) => item.aliases.map((alias) => [alias, item.slug] as const)));
export const getTaxonomySlug = (category?: string | null) => category ? (byAlias.get(category) ?? 'other') : 'other';
export const getTaxonomyForCategory = (category?: string | null) => SERVICE_TAXONOMY.find((item) => item.slug === getTaxonomySlug(category)) ?? null;
export const getTaxonomyAliases = (slug: string) => SERVICE_TAXONOMY.find((item) => item.slug === slug)?.aliases ?? [];
