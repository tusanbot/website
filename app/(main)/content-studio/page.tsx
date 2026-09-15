import ContentStudio from "@/app/(main)/admin/content-studio/ContentStudio";
import ContentStudioMediaPanel from "@/components/admin/ContentStudioMediaPanel";
import ContentStudioApplySlideDuration from "@/components/admin/ContentStudioApplySlideDuration";

export default function ContentStudioPage() {
  return (
    <ContentStudioMediaPanel>
      <ContentStudio />
      <ContentStudioApplySlideDuration />
    </ContentStudioMediaPanel>
  );
}
