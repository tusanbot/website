import FloatingHeader from "@/components/home/FloatingHeader";
import PageLoader from "@/components/home/PageLoader";
import HeroSection from "@/components/home/HeroSection";
import ActiveAnnouncements from "@/components/home/ActiveAnnouncements";
import PopularServices from "@/components/home/PopularServices";
import SocialServicesPreview from "@/components/home/SocialServicesPreview";
import ToolsPreview from "@/components/home/ToolsPreview";
import ProcessTimeline from "@/components/home/ProcessTimeline";
import StatsSection from "@/components/home/StatsSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FinalCTA from "@/components/home/FinalCTA";
import HomeFooter from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <>
      <PageLoader />
      <FloatingHeader />
      <HeroSection />
      <ActiveAnnouncements />
      <PopularServices />
      <SocialServicesPreview />
      <ToolsPreview />
      <ProcessTimeline />
      <StatsSection />
      <FeaturesSection />
      <FinalCTA />
      <HomeFooter />
    </>
  );
}
