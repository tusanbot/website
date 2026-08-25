import dynamic from "next/dynamic";
import FloatingHeader from "@/components/home/FloatingHeader";
import HeroSection from "@/components/home/HeroSection";

const ActiveAnnouncements = dynamic(() => import("@/components/home/ActiveAnnouncements"));
const PopularServices = dynamic(() => import("@/components/home/PopularServices"));
const BlogPreview = dynamic(() => import("@/components/home/BlogPreview"));
const SocialServicesPreview = dynamic(() => import("@/components/home/SocialServicesPreview"));
const ToolsPreview = dynamic(() => import("@/components/home/ToolsPreview"));
const ProcessTimeline = dynamic(() => import("@/components/home/ProcessTimeline"));
const StatsSection = dynamic(() => import("@/components/home/StatsSection"));
const FeaturesSection = dynamic(() => import("@/components/home/FeaturesSection"));
const FinalCTA = dynamic(() => import("@/components/home/FinalCTA"));
const HomeFooter = dynamic(() => import("@/components/home/HomeFooter"));

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
      <FinalCTA />
      <HomeFooter />
    </>
  );
}
