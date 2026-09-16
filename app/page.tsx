import FloatingHeader from "@/components/home/FloatingHeader";
import HeroSection from "@/components/home/HeroSection";
import HomeAnnouncementsRail from "@/components/home/HomeAnnouncementsRail";
import PopularServices from "@/components/home/PopularServices";
import SocialServicesRail from "@/components/home/SocialServicesRail";
import ToolsPreview from "@/components/home/ToolsPreview";
import ProcessTimeline from "@/components/home/ProcessTimeline";
import FaqSection from "@/components/home/FaqSection";
import RulesSection from "@/components/home/RulesSection";
import SupportChatWidget from "@/components/home/SupportChatWidget";
import HomeFooter from "@/components/home/HomeFooter";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function HomePage() {
  return <main className="home-compact pb-24 lg:pb-0">
    <FloatingHeader />
    <HeroSection />
    <HomeAnnouncementsRail />
    <PopularServices />
    <SocialServicesRail />
    <ToolsPreview />
    <ProcessTimeline />
    <FaqSection />
    <RulesSection />
    <section dir="rtl" className="max-w-5xl mx-auto px-5 pb-8" aria-labelledby="site-search-topics">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <details>
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
            موضوعات و خدمات اصلی کافی نت توسن
          </summary>
          <div className="border-t px-5 pb-5 pt-4">
            <h2 id="site-search-topics" className="sr-only">موضوعات و خدمات اصلی کافی نت توسن</h2>
            <p className="text-sm leading-8 text-[var(--text-muted)]">
              کافی نت توسن؛ ارائه‌دهنده خدمات آنلاین، خدمات اینترنتی و اداری، ثبت نام آنلاین، انجام امور سامانه‌ها، خدمات دانشجویی و کامپیوتری در مراغه.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]" aria-label="موضوعات اصلی سایت">
              {[
                "کافی نت",
                "کافی نت مراغه",
                "خدمات آنلاین",
                "خدمات اینترنتی",
                "ثبت نام آنلاین",
                "ثبت نام اینترنتی",
                "خدمات اداری آنلاین",
                "خدمات دانشجویی",
                "خدمات کامپیوتری",
                "انجام امور سامانه‌ها",
              ].map((term) => <li key={term} className="rounded-lg border bg-gray-50 px-2.5 py-1.5">{term}</li>)}
            </ul>
          </div>
        </details>
      </div>
    </section>
    <HomeFooter />
    <SupportChatWidget />
    <MobileBottomNav />
  </main>;
}
