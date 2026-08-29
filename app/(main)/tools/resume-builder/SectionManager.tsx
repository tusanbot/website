"use client";

import { useEffect, useState } from "react";

type Section = { id: string; label: string; selector: string };

const DEFAULT_SECTIONS: Section[] = [
  { id: "personal", label: "اطلاعات شخصی", selector: "[data-resume-section='personal']" },
  { id: "template", label: "قالب رزومه", selector: "[data-resume-section='template']" },
  { id: "experience", label: "سوابق کاری", selector: "[data-resume-section='experience']" },
  { id: "education", label: "تحصیلات", selector: "[data-resume-section='education']" },
  { id: "projects", label: "پروژه‌ها", selector: "[data-resume-section='projects']" },
  { id: "skills", label: "مهارت‌ها", selector: "[data-resume-section='skills']" },
  { id: "research", label: "تحقیقات / مقالات", selector: "[data-resume-section='research']" },
  { id: "languages", label: "زبان‌ها", selector: "[data-resume-section='languages']" },
  { id: "certifications", label: "دوره‌ها و گواهینامه‌ها", selector: "[data-resume-section='certifications']" },
  { id: "interests", label: "علایق", selector: "[data-resume-section='interests']" },
];

const STORAGE_KEY = "tusan-resume-section-settings";

type Saved = { order: string[]; hidden: string[] };

export default function SectionManager() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      const byId = new Map(DEFAULT_SECTIONS.map(s => [s.id, s]));
      const ordered = saved.order.map(id => byId.get(id)).filter(Boolean) as Section[];
      const missing = DEFAULT_SECTIONS.filter(s => !saved.order.includes(s.id));
      setSections([...ordered, ...missing]);
      setHidden(saved.hidden.filter(id => byId.has(id)));
    } catch {}
  }, []);

  useEffect(() => {
    const saved: Saved = { order: sections.map(s => s.id), hidden };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {}
    const root = document.querySelector("[data-resume-editor]");
    if (!root) return;
    sections.forEach(section => {
      const el = root.querySelector(section.selector) as HTMLElement | null;
      if (el) {
        el.style.display = hidden.includes(section.id) ? "none" : "";
        el.dataset.resumeManagedOrder = String(sections.indexOf(section));
      }
    });
  }, [sections, hidden]);

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    const copy = [...sections];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setSections(copy);
  };

  const reset = () => {
    setSections(DEFAULT_SECTIONS);
    setHidden([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-black">مدیریت بخش‌های رزومه</h2><p className="mt-1 text-xs text-[var(--text-muted)]">بخش‌ها را نمایش/مخفی یا جابه‌جا کنید.</p></div>
        <button type="button" onClick={() => setOpen(v => !v)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold">{open ? "بستن" : "مدیریت"}</button>
      </div>
      {open && <div className="mt-4 space-y-2">
        {sections.map((section, index) => <div key={section.id} className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-2">
          <button type="button" onClick={() => setHidden(v => v.includes(section.id) ? v.filter(id => id !== section.id) : [...v, section.id])} className="min-w-16 rounded-lg px-2 py-1.5 text-xs font-bold">{hidden.includes(section.id) ? "نمایش" : "مخفی"}</button>
          <span className={`flex-1 text-sm font-bold ${hidden.includes(section.id) ? "opacity-40" : ""}`}>{section.label}</span>
          <button type="button" aria-label="انتقال به بالا" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-[var(--border)] px-2 py-1 disabled:opacity-30">↑</button>
          <button type="button" aria-label="انتقال به پایین" disabled={index === sections.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-[var(--border)] px-2 py-1 disabled:opacity-30">↓</button>
        </div>)}
        <button type="button" onClick={reset} className="mt-2 w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600">بازگردانی ترتیب و نمایش پیش‌فرض</button>
      </div>}
    </div>
  );
}
