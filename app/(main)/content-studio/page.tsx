import ContentStudio from "@/app/(main)/admin/content-studio/ContentStudio";
import ContentStudioMediaPanel from "@/components/admin/ContentStudioMediaPanel";

export default function ContentStudioPage() {
  return (
    <ContentStudioMediaPanel>
      <ContentStudio />
    </ContentStudioMediaPanel>
  );
}
