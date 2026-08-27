import { FileText, ShieldCheck, Scale, UserCheck } from "lucide-react";
import { SectionHeader } from "@/components/ui";

const rules = [
  { icon: FileText, title: "اطلاعات صحیح", text: "مسئولیت صحت اطلاعات و مدارک ارسالی با صاحب سفارش است." },
  { icon: ShieldCheck, title: "امنیت اطلاعات", text: "اطلاعات سفارش فقط برای ارائه و پیگیری خدمت استفاده می‌شود." },
  { icon: UserCheck, title: "احراز هویت", text: "در خدمات نیازمند احراز هویت، اطلاعات باید متعلق به درخواست‌کننده باشد." },
  { icon: Scale, title: "شرایط هر خدمت", text: "هزینه، زمان، مدارک و شرایط هر خدمت را پیش از سفارش بررسی کنید." },
];

export default function RulesSection() {
  return (
    <section id="rules" className="relative scroll-mt-28 py-10 md:py-12" dir="rtl">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionHeader title="قوانین و مقررات" description="نکات مهم پیش از ثبت سفارش." align="center" />
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {rules.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
              <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><Icon size={19} /></div><h3 className="font-black text-[var(--text)]">{title}</h3></div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-4 py-3 text-center text-sm leading-6 text-[var(--text-muted)]">ثبت سفارش به منزله مطالعه و پذیرش قوانین اختصاصی همان خدمت و شرایط اعلام‌شده در فرآیند سفارش است.</div>
      </div>
    </section>
  );
}
