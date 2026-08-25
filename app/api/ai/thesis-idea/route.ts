import { NextRequest, NextResponse } from "next/server";
import { requireAiProfile } from "@/lib/ai/server";
import { generateWithGemini, parseGeminiJson } from "@/lib/ai/gemini";

const MAX = 1200;

type Idea = { title: string; problem: string; novelty: string; questions: string[]; objectives: string[]; method: string; keywords: string[] };

export async function POST(req: NextRequest) {
  try {
    const session = await requireAiProfile();
    const body = await req.json();
    const input = {
      degree: String(body.degree || "").trim(), field: String(body.field || "").trim(), major: String(body.major || "").trim(),
      interests: String(body.interests || "").trim(), keywords: String(body.keywords || "").trim(), goal: String(body.goal || "").trim(),
    };
    const joined = Object.values(input).join(" ");
    if (joined.length < 5) return NextResponse.json({ error: "حداقل رشته یا حوزه مورد علاقه را وارد کنید." }, { status: 400 });
    if (joined.length > MAX) return NextResponse.json({ error: `اطلاعات ورودی بیش از ${MAX} کاراکتر است.` }, { status: 400 });
    const prompt = `به عنوان مشاور پژوهشی دانشگاهی فارسی‌زبان عمل کن. بر اساس اطلاعات زیر 4 ایده پایان‌نامه کاربردی و قابل پژوهش پیشنهاد بده. از ادعاهای قطعی درباره جدیدبودن پرهیز کن و «نوآوری پیشنهادی» را به‌صورت قابل بررسی بنویس. خروجی فقط JSON معتبر و بدون Markdown باشد با ساختار {"ideas":[{"title":"","problem":"","novelty":"","questions":[""],"objectives":[""],"method":"","keywords":[""]}]}. برای هر ایده 1 تا 2 سؤال پژوهش، 2 تا 4 هدف و 4 تا 7 کلیدواژه بده. اطلاعات: مقطع=${input.degree}; رشته=${input.field}; گرایش=${input.major}; علاقه=${input.interests}; کلیدواژه=${input.keywords}; هدف/محدودیت=${input.goal}`;
    const result = await generateWithGemini(session.profile.id, prompt, session.profile.model || "gemini-2.5-flash", { temperature: 0.75, maxOutputTokens: 5000, timeoutMs: 45000 });
    const parsed = parseGeminiJson<{ ideas?: Idea[] }>(result.text);
    if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) throw Object.assign(new Error("EMPTY"), { status: 502 });
    return NextResponse.json({ ideas: parsed.ideas.slice(0, 6), model: result.model });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : 500;
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "AI_PROFILE_REQUIRED" }, { status: 401 });
    if (status === 401 || status === 403) return NextResponse.json({ error: "کلید Gemini معتبر نیست یا دسترسی لازم وجود ندارد." }, { status: 401 });
    if (status === 429) return NextResponse.json({ error: "سهمیه Gemini پر شده است. کمی بعد دوباره تلاش کنید." }, { status: 429 });
    if (status === 504) return NextResponse.json({ error: "زمان پردازش تمام شد. دوباره تلاش کنید." }, { status: 504 });
    console.error("thesis-idea:", error);
    return NextResponse.json({ error: "تولید ایده پایان‌نامه انجام نشد. دوباره تلاش کنید." }, { status: 502 });
  }
}
