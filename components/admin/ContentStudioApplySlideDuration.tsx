"use client";

import { Check } from "lucide-react";
import { useState } from "react";

const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function toNumber(value: string) {
  const normalized = value
    .replace(/[۰-۹٠-٩]/g, char => DIGIT_MAP[char] || char)
    .replace(",", ".")
    .trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function getTimelineSection() {
  return Array.from(document.querySelectorAll<HTMLElement>("section")).find(section =>
    section.innerText.includes("نوار زمان و تقسیم زمان بین اسلایدها"),
  ) || null;
}

function getSelectedTimelineCard(section: HTMLElement) {
  const cards = Array.from(section.querySelectorAll<HTMLElement>("div")).filter(card => {
    const text = card.innerText.trim();
    return /^اسلاید\s+\d+/.test(text) && /\d+(?:[.,]\d+)?\s*ثانیه/.test(text);
  });
  return cards.find(card =>
    card.className.includes("ring-2") && card.className.includes("ring-emerald-500"),
  ) || null;
}

function getTimelineDuration(section: HTMLElement) {
  const card = getSelectedTimelineCard(section);
  if (!card) return 0;
  const match = card.innerText.match(/(\d+(?:[.,]\d+)?)\s*ثانیه/);
  return match ? toNumber(match[1]) : 0;
}

function getEditorSection() {
  return Array.from(document.querySelectorAll<HTMLElement>("section")).find(section =>
    section.innerText.includes("ویرایش اسلاید فعال"),
  ) || null;
}

function getEditorDurationInput() {
  return getEditorSection()?.querySelector<HTMLInputElement>('input[type="number"][min="1"][max="30"]') || null;
}

function openEditorIfNeeded() {
  if (getEditorDurationInput()) return false;
  const section = getEditorSection();
  if (!section) return false;
  const button = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find(button =>
    button.textContent?.includes("ویرایش"),
  );
  if (!button) return false;
  button.click();
  return true;
}

function setControlledInput(input: HTMLInputElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
}

export default function ContentStudioApplySlideDuration() {
  const [status, setStatus] = useState("");
  const [applying, setApplying] = useState(false);

  async function apply() {
    if (applying) return;
    setApplying(true);
    setStatus("");

    try {
      const timeline = getTimelineSection();
      if (!timeline) throw new Error("نوار زمان پیدا نشد.");

      const duration = getTimelineDuration(timeline);
      if (!duration) throw new Error("ابتدا یک اسلاید را در تایم‌لاین انتخاب کنید.");

      let input = getEditorDurationInput();
      if (!input && openEditorIfNeeded()) {
        await new Promise(resolve => window.setTimeout(resolve, 80));
        input = getEditorDurationInput();
      }
      if (!input) throw new Error("کنترل مدت اسلاید در بخش «ویرایش اسلاید فعال» پیدا نشد.");

      const next = Math.min(30, Math.max(1, Math.round(duration * 100) / 100));
      setControlledInput(input, next);
      setStatus(`مدت ${next.toFixed(2)} ثانیه روی اسلاید اعمال شد.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "اعمال تغییر ناموفق بود.");
    } finally {
      window.setTimeout(() => setApplying(false), 250);
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-bold">اعمال مدت اسلاید</div>
          <p className="mt-1 text-xs text-slate-500">
            مدت اسلاید انتخاب‌شده در تایم‌لاین را روی اسلاید فعال ادیتور اعمال می‌کند. اگر بخش ویرایش بسته باشد، ابتدا آن را باز می‌کند.
          </p>
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={applying}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {applying ? "در حال اعمال..." : "اعمال روی اسلاید"}
        </button>
      </div>
      {status && <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-slate-700">{status}</div>}
    </div>
  );
}
