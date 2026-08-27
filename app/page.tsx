import FloatingHeader from "@/components/home/FloatingHeader";
import HeroSection from "@/components/home/HeroSection";
import ActiveAnnouncements from "@/components/home/ActiveAnnouncements";
import PopularServices from "@/components/home/PopularServices";
import ServiceCategoriesRail from "@/components/home/ServiceCategoriesRail";
import BlogPreview from "@/components/home/BlogPreview";
import SocialServicesPreview from "@/components/home/SocialServicesPreview";
import ToolsPreview from "@/components/home/ToolsPreview";
import ProcessTimeline from "@/components/home/ProcessTimeline";
import FaqSection from "@/components/home/FaqSection";
import RulesSection from "@/components/home/RulesSection";
import FinalCTA from "@/components/home/FinalCTA";
import SupportChatWidget from "@/components/home/SupportChatWidget";
import HomeFooter from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <>
      <FloatingHeader />
      <HeroSection />
      <ActiveAnnouncements />

      {/* Compact discovery rails */}
      <PopularServices />
      <ServiceCategoriesRail />
      <SocialServicesPreview />
      <BlogPreview />

      {/* Secondary content kept for trust, guidance and SEO */}
      <ToolsPreview />
      <ProcessTimeline />
      <FaqSection />
      <RulesSection />
      <FinalCTA />

      <HomeFooter />
      <SupportChatWidget />
    </>
  );
}
