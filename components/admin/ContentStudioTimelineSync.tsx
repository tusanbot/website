"use client";

import { useEffect, useRef } from "react";

const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function toNumber(value: string) {
  const normalized = value.replace(/[۰-۹٠-٩]/g, char => DIGIT_MAP[char] || char).replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function getStudioSection() {
  return Array.from(document.querySelectorAll<HTMLElement>("section")).find(section =>
    section.innerText.includes("نوار زمان و تقسیم زمان بین اسلایدها"),
  ) || null;
}

function getDurationInput() {
  return document.querySelector<HTMLInputElement>('input[type="number"][min="1"][max="30"]');
}

function getStageIndex() {
  const controls = document.querySelector<HTMLElement>(".stage-controls");
  const match = controls?.innerText.match(/(?:در حال پخش|توقف)\s*·\s*(\d+)\s*\/\s*(\d+)/);
  return match ? Number(match[1]) - 1 : 0;
}

function getStageButtons() {
  const controls = document.querySelector<HTMLElement>(".stage-controls");
  return controls ? Array.from(controls.querySelectorAll<HTMLButtonElement>("button")) : [];
}

function getTimelineCards(section: HTMLElement) {
  return Array.from(section.querySelectorAll<HTMLElement>("div")).filter(card => {
    const text = card.innerText.trim();
    return /^اسلاید\s+\d+/.test(text)
      && /\d+(?:[.,]\d+)?\s*ثانیه/.test(text)
      && card.querySelectorAll("select").length === 1;
  });
}

function getSelectedTimelineIndex(section: HTMLElement) {
  const cards = getTimelineCards(section);
  const selected = cards.findIndex(card => card.className.includes("ring-2") && card.className.includes("ring-emerald-500"));
  return selected >= 0 ? selected : 0;
}

function getTimelineDurations(section: HTMLElement) {
  return getTimelineCards(section).map(card => {
    const match = card.innerText.match(/(\d+(?:[.,]\d+)?)\s*ثانیه/);
    return match ? toNumber(match[1]) : 0;
  });
}

function activateEditorIndex(target: number) {
  const current = getStageIndex();
  if (current === target) return;
  const buttons = getStageButtons();
  const previous = buttons[0];
  const next = buttons[2];
  if (!previous || !next) return;
  const direction = target > current ? next : previous;
  for (let i = 0; i < Math.abs(target - current); i += 1) direction.click();
}

function setEditorDuration(value: number) {
  const input = getDurationInput();
  if (!input || !Number.isFinite(value)) return false;
  const next = Math.min(30, Math.max(1, Math.round(value * 100) / 100));
  const current = toNumber(input.value);
  if (Math.abs(current - next) < 0.01) return false;

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, String(next));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function dragBoundaryTo(boundary: number, total: number, timeline: HTMLElement, button: HTMLButtonElement) {
  if (total <= 0) return;
  const rect = timeline.getBoundingClientRect();
  if (!rect.width) return;
  const clientX = rect.left + (boundary / total) * rect.width;
  const pointerId = 991;
  button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX, pointerId, button: 0 }));
  window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX, pointerId }));
  window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX, pointerId }));
}

function setTimelineDuration(value: number) {
  const section = getStudioSection();
  if (!section) return;
  const timeline = section.querySelector<HTMLElement>("[class*='select-none'][class*='overflow-hidden']");
  if (!timeline) return;

  const durations = getTimelineDurations(section);
  if (!durations.length) return;
  const selected = getSelectedTimelineIndex(section);
  const current = durations[selected] || 0;
  const next = Math.min(30, Math.max(0.5, Math.round(value * 100) / 100));
  if (Math.abs(current - next) < 0.01) return;

  const total = durations.reduce((sum, duration) => sum + duration, 0);
  if (durations.length < 2 || total <= 0) return;

  const boundaryButtons = Array.from(section.querySelectorAll<HTMLButtonElement>('button[aria-label^="تغییر مرز اسلاید"]'));
  if (!boundaryButtons.length) return;

  const starts = durations.reduce<number[]>((acc, duration) => {
    acc.push((acc.at(-1) || 0) + duration);
    return acc;
  }, []);

  if (selected < durations.length - 1) {
    const targetBoundary = (starts[selected] || 0) + (next - current);
    const clamped = Math.max(0.5, Math.min(total - 0.5, targetBoundary));
    dragBoundaryTo(clamped, total, timeline, boundaryButtons[selected]);
  } else {
    const targetBoundary = total - next;
    const boundaryIndex = boundaryButtons.length - 1;
    const clamped = Math.max(0.5, Math.min(total - 0.5, targetBoundary));
    dragBoundaryTo(clamped, total, timeline, boundaryButtons[boundaryIndex]);
  }
}

/**
 * Bridges the editor and timeline without polling the DOM.
 * The old implementation sampled the whole document every 250–500ms and
 * copied whichever "ثانیه" text it found into the editor. That could make
 * values such as 12.49 overwrite manual duration edits.
 */
export default function ContentStudioTimelineSync() {
  const syncing = useRef(false);
  const lastTimelineSignature = useRef("");
  const releaseTimer = useRef<number | null>(null);

  useEffect(() => {
    const section = getStudioSection();
    if (!section) return;

    const release = () => {
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
      releaseTimer.current = window.setTimeout(() => { syncing.current = false; }, 120);
    };
    const readSignature = () => getTimelineDurations(section).map(value => value.toFixed(2)).join("|");
    lastTimelineSignature.current = readSignature();

    const onEditorInput = (event: Event) => {
      if (syncing.current) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "number" || target.min !== "1" || target.max !== "30") return;
      const value = toNumber(target.value);
      if (!value) return;
      syncing.current = true;
      setTimelineDuration(value);
      release();
    };

    const onTimelineClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("button");
      if (!button || !section.contains(button)) return;
      const match = button.innerText.match(/^اسلاید\s+(\d+)/);
      if (!match) return;
      const index = Number(match[1]) - 1;
      window.setTimeout(() => {
        activateEditorIndex(index);
        const durations = getTimelineDurations(section);
        if (durations[index]) setEditorDuration(durations[index]);
      }, 0);
    };

    const observer = new MutationObserver(() => {
      if (syncing.current) return;
      const signature = readSignature();
      if (!signature || signature === lastTimelineSignature.current) return;
      lastTimelineSignature.current = signature;
      const selected = getSelectedTimelineIndex(section);
      const durations = getTimelineDurations(section);
      const value = durations[selected];
      if (!value) return;

      syncing.current = true;
      activateEditorIndex(selected);
      setEditorDuration(value);
      release();
    });

    document.addEventListener("input", onEditorInput, true);
    document.addEventListener("change", onEditorInput, true);
    section.addEventListener("click", onTimelineClick, true);
    observer.observe(section, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] });

    return () => {
      document.removeEventListener("input", onEditorInput, true);
      document.removeEventListener("change", onEditorInput, true);
      section.removeEventListener("click", onTimelineClick, true);
      observer.disconnect();
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    };
  }, []);

  return null;
}
