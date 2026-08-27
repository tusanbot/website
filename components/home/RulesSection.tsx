import { FileText, ShieldCheck, Scale, UserCheck } from "lucide-react";
import { GlassPanel, SectionHeader } from "@/components/ui";

const rules = [
    { icon: FileText, title: "اطلاعات صحیح وارد کنید", text: "مسئولیت صحت اطلاعات و مدارکی که برای ثبت سفارش ارسال می‌کنید با صاحب سفارش است." },
    { icon: ShieldCheck, title: "حفظ امنیت اطلاعات", text: "اطلاعات سفارش فقط برای ارائه و پیگیری خدمت استفاده می‌شود و دسترسی مدیریتی سامانه محدود است." },
    { icon: UserCheck, title: "احراز هویت و مالکیت", text: "در خدماتی که نیاز به احراز هویت دارند، اطلاعات باید متعلق به شخص درخواست‌کننده باشد." },
    { icon: Scale, title: "شرایط هر خدمت", text: "هزینه، زمان انجام، مدارک و شرایط هر خدمت می‌تواند متفاوت باشد و پیش از ثبت سفارش باید بررسی شود." },
];

export default function RulesSection() {
    return (
        <section id="rules" className="relative scroll-mt-28 py-20 sm:py-24" dir="rtl">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <SectionHeader title="قوانین و مقررات" description="برای ثبت سفارش در توسن، موارد زیر را در نظر داشته باشید." align="center" />
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {rules.map(({ icon: Icon, title, text }) => (
                        <GlassPanel key={title} className="rounded-3xl p-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={27} /></div>
                            <h3 className="mt-5 text-lg font-black text-[var(--text)]">{title}</h3>
                            <p className="mt-3 leading-7 text-[var(--text-muted)]">{text}</p>
                        </GlassPanel>
                    ))}
                </div>
                <div className="mt-6 rounded-3xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 p-5 text-center leading-8 text-[var(--text-muted)]">
                    ثبت سفارش به منزله مطالعه و پذیرش قوانین اختصاصی همان خدمت و شرایط اعلام‌شده در فرآیند سفارش است. در صورت ابهام، پیش از پرداخت یا ارسال نهایی مدارک از پشتیبانی توسن راهنمایی بگیرید.
                </div>
            </div>
        </section>
    );
}
