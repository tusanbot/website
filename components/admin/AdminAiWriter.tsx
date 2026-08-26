"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import AiSeoApplyPanel from "@/components/admin/AiSeoApplyPanel";

type Target = "service" | "blog";

export default function AdminAiWriter({ target, current, onApply }: { target: Target; current: Record<string, unknown>; onApply: (data: Record<string, unknown>) => void }) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("ابتدا وارد حساب مدیریت شوید.");
      const response = await fetch("/api/admin/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ target, current, instruction }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تولید محتوا انجام نشد.");
      onApply(data.data || {});
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ناشناخته"); }
    finally { setLoading(false); }
  }

  return <div className="space-y-3">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
      <div><h3 className="font-black text-emerald-900">✨ دستیار هوش مصنوعی توسن</h3><p className="text-xs text-emerald-800 mt-1">با پروفایل Gemini شما پیشنهاد تولید می‌کند؛ هیچ چیزی بدون تأیید شما ذخیره یا منتشر نمی‌شود.</p></div>
      <textarea value={instruction} onChange={e => setInstruction(e.target.value)} rows={2} placeholder={target === "blog" ? "مثلاً: مقاله‌ای درباره خدمات تعویض پلاک خودرو برای کاربران مراغه بنویس." : "مثلاً: خدمت استعلام و پرداخت عوارض خودرو را با فرم مناسب پیشنهاد بده."} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
      {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      <button type="button" onClick={generate} disabled={loading} className="rounded-xl bg-[#09967C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{loading ? "در حال تولید..." : target === "blog" ? "تولید پیش‌نویس با AI" : "تولید خدمت با AI"}</button>
    </section>
    <AiSeoApplyPanel target={target} onApply={onApply} />
  </div>;
}
