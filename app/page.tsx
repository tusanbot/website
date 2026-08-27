import FloatingHeader from "@/components/home/FloatingHeader";
import HeroSection from "@/components/home/HeroSection";
import ActiveAnnouncements from "@/components/home/ActiveAnnouncements";
import PopularServices from "@/components/home/PopularServices";
import BlogPreview from "@/components/home/BlogPreview";
import SocialServicesPreview from "@/components/home/SocialServicesPreview";
import ToolsPreview from "@/components/home/ToolsPreview";
import ProcessTimeline from "@/components/home/ProcessTimeline";
import StatsSection from "@/components/home/StatsSection";
import FeaturesSection from "@/components/home/FeaturesSection";
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
      <PopularServices />
      <BlogPreview />
      <SocialServicesPreview />
      <ToolsPreview />
      <ProcessTimeline />
      <StatsSection />
      <FeaturesSection />
      <FaqSection />
      <RulesSection />
      <FinalCTA />
      <HomeFooter />
      <SupportChatWidget />
    </>
  );
}
