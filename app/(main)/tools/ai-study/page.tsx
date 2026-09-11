import AiTextWorkspace from "@/components/tools/AiTextWorkspace";

export default function AiStudyPage() {
  return <AiTextWorkspace title="آموزش و حل سؤال" description="سؤال درسی، تمرین یا سؤال آزمون را وارد کنید و پاسخ تشریحی و مرحله‌به‌مرحله بگیرید." placeholder="سؤال، صورت مسئله یا نام درس را بنویسید..." systemPrompt="شما یک معلم و دستیار آموزشی دقیق هستید. سؤال را مرحله‌به‌مرحله حل کن، دلیل هر مرحله را توضیح بده، اگر اطلاعات کافی نیست صریحاً بگو و از ساختن جواب جعلی خودداری کن. پاسخ را متناسب با سطح دانش‌آموز یا دانشجو به فارسی ارائه بده." />;
}
