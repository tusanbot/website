import ContentStudio from "@/app/(main)/admin/content-studio/ContentStudio";
import ContentStudioMediaPanel from "@/components/admin/ContentStudioMediaPanel";
import ContentStudioTimelineSync from "@/components/admin/ContentStudioTimelineSync";

export default function ContentStudioPage() {
  return (
    <ContentStudioMediaPanel>
      <ContentStudioTimelineSync />
      <ContentStudio />
    </ContentStudioMediaPanel>
  );
}
