import AiTextWorkspace from "@/components/tools/AiTextWorkspace";

export default function AiDocumentsPage() {
  return <AiTextWorkspace title="مدیریت اسناد با هوش مصنوعی" description="متن یا PDF را وارد کنید و خلاصه، نکات کلیدی، بازنویسی یا پاسخ به سؤال‌های خود درباره سند را دریافت کنید." placeholder="مثلاً: این سند را در ۱۰ نکته خلاصه کن و موارد مهم برای ثبت‌نام را جداگانه بنویس..." systemPrompt="شما دستیار حرفه‌ای مدیریت اسناد هستید. محتوای سند را دقیق بخوان، اطلاعات را جعل نکن، ساختار و نکات مهم را حفظ کن و پاسخ را به فارسی روشن و کاربردی ارائه بده." fileMode />;
}
