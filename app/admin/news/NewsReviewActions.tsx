"use client";
import { useState } from "react";
import { Check, Eye, Archive, RotateCcw } from "lucide-react";

export default function NewsReviewActions({ id, status }: { id: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function change(next: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/news/" + id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره وضعیت انجام نشد");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "خطا"); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    {status !== "published" && <button disabled={busy} onClick={() => change("published")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Check size={14}/> انتشار</button>}
    {status !== "review" && <button disabled={busy} onClick={() => change("review")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><Eye size={14}/> بررسی</button>}
    {status !== "archived" && <button disabled={busy} onClick={() => change("archived")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><Archive size={14}/> بایگانی</button>}
    {status === "archived" && <button disabled={busy} onClick={() => change("review")} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"><RotateCcw size={14}/> بازگردانی</button>}
    {message && <span role="alert" className="text-xs text-red-600">{message}</span>}
  </div>;
}
