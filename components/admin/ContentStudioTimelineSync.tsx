"use client";

import { useEffect } from "react";

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) return;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function syncTimelineDurationToEditor() {
  const selectedCard = Array.from(document.querySelectorAll<HTMLElement>("div")).find(el => {
    if (!el.className || typeof el.className !== "string") return false;
    if (!el.className.includes("ring-emerald-500")) return false;
    return /اسلاید\s+\d+/.test(el.textContent || "") && /ثانیه/.test(el.textContent || "");
  });
  if (!selectedCard) return;

  const match = selectedCard.textContent?.match(/([0-9]+(?:[.,][0-9]+)?)\s*ثانیه/);
  if (!match) return;
  const duration = Math.min(30, Math.max(1, Number(match[1].replace(",", "."))));
  if (!Number.isFinite(duration)) return;

  const editorPanel = Array.from(document.querySelectorAll<HTMLElement>("section")).find(section =>
    (section.textContent || "").includes("زمان نمایش اسلاید") && section.querySelector('input[type="range"]')
  );
  if (!editorPanel) return;

  const range = editorPanel.querySelector<HTMLInputElement>('input[type="range"]');
  const number = editorPanel.querySelector<HTMLInputElement>('input[type="number"]');
  if (!range || !number) return;

  const current = Number(range.value);
  if (Number.isFinite(current) && Math.abs(current - duration) < 0.05) return;
  setReactInputValue(range, duration.toString());
  setReactInputValue(number, duration.toString());
}

export default function ContentStudioTimelineSync() {
  useEffect(() => {
    const timer = window.setInterval(syncTimelineDurationToEditor, 250);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
