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

export default function HomePage() {
  return <main className="home-compact">
    <FloatingHeader />
    <HeroSection />
    <HomeAnnouncementsRail />
    <PopularServices />
    <SocialServicesRail />
    <ToolsPreview />
    <ProcessTimeline />
    <FaqSection />
    <RulesSection />
    <HomeFooter />
    <SupportChatWidget />
  </main>;
}
