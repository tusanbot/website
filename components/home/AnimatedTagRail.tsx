"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";

type RailItem = {
  id: string;
  title: string;
  href?: string;
  price?: string | number | null;
  icon?: React.ReactNode;
  description?: string;
  panel?: React.ReactNode;
};

type AnimatedTagRailProps = {
  items: RailItem[];
  ariaLabel: string;
  speed?: number;
  direction?: "rtl" | "ltr";
  className?: string;
  itemClassName?: string;
  renderPanel?: (item: RailItem) => React.ReactNode;
};

export default function AnimatedTagRail({
  items,
  ariaLabel,
  speed = 42,
  direction = "rtl",
  className = "",
  itemClassName = "",
  renderPanel,
}: AnimatedTagRailProps) {
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  if (!items.length) return null;

  const repeated = [...items, ...items];
  const actualPaused = paused || !!expandedId || reducedMotion;

  function pauseForInteraction(id?: string) {
    setPaused(true);
    if (id) setExpandedId(id);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }

  function resumeAfterInteraction() {
    if (expandedId) return;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 180);
  }

  function handlePointerDown(item: RailItem) {
    if (renderPanel && item.panel) {
      setPaused(true);
      setExpandedId((current) => (current === item.id ? null : item.id));
    } else {
      setPaused(true);
    }
  }

  return (
    <div dir={direction} className={`w-full ${className}`}>
      <div
        className="relative overflow-visible"
        aria-label={ariaLabel}
        onMouseLeave={() => {
          if (!expandedId) setPaused(false);
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[var(--background)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[var(--background)] to-transparent" />

        <div className="overflow-x-hidden overflow-y-visible py-3">
          <div
            className="flex w-max items-center gap-3 motion-safe:animate-[tusan-rail_linear_infinite]"
            style={{
              animationDuration: `${Math.max(16, (items.reduce((sum, item) => sum + item.title.length + 8, 0) * 0.85) / Math.max(speed, 1))}s`,
              animationPlayState: actualPaused ? "paused" : "running",
              animationDirection: direction === "rtl" ? "normal" : "reverse",
            }}
          >
            {repeated.map((item, index) => {
              const key = `${item.id}-${index}`;
              const active = expandedId === item.id;
              const content = (
                <span
                  className={`group relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-2 text-sm font-black text-[var(--text)] shadow-sm backdrop-blur transition duration-300 hover:scale-[1.08] hover:border-[var(--primary)]/50 hover:shadow-[0_12px_32px_rgba(9,150,124,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${active ? "scale-[1.08] border-[var(--primary)] shadow-[0_12px_32px_rgba(9,150,124,0.16)]" : ""} ${itemClassName}`}
                  onMouseEnter={() => pauseForInteraction(item.panel ? item.id : undefined)}
                  onMouseLeave={resumeAfterInteraction}
                  onFocus={() => pauseForInteraction(item.panel ? item.id : undefined)}
                  onBlur={resumeAfterInteraction}
                  onPointerDown={() => handlePointerDown(item)}
                >
                  {item.icon}
                  <span className="max-w-[220px] truncate">{item.title}</span>
                  {item.price !== null && item.price !== undefined && item.price !== "" && (
                    <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-xs text-[var(--primary)]">
                      {typeof item.price === "number" ? `${item.price.toLocaleString("fa-IR")} تومان` : item.price}
                    </span>
                  )}
                  {item.href && !item.panel && <ArrowLeft size={15} className="shrink-0 text-[var(--primary)]" />}
                </span>
              );

              return (
                <div key={key} className="relative shrink-0">
                  {item.href && !item.panel ? (
                    <Link href={item.href} aria-label={item.title}>{content}</Link>
                  ) : (
                    <button type="button" className="cursor-pointer" aria-expanded={active} aria-label={item.title} onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))}>
                      {content}
                    </button>
                  )}
                  {active && renderPanel && item.panel && (
                    <div className="absolute right-1/2 top-[calc(100%+12px)] z-50 w-[min(92vw,430px)] translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-right shadow-[0_22px_60px_rgba(0,0,0,0.14)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setExpandedId(null); setPaused(false); }}>
                      {renderPanel(item)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-1 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setExpandedId(null);
            setPaused((value) => !value);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-muted)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
          aria-label={actualPaused ? "ادامه حرکت" : "توقف حرکت"}
        >
          {actualPaused ? <Play size={12} /> : <Pause size={12} />}
          {actualPaused ? "ادامه" : "توقف"}
        </button>
      </div>

      <style jsx>{`
        @keyframes tusan-rail {
          from { transform: translateX(0); }
          to { transform: translateX(50%); }
        }
      `}</style>
    </div>
  );
}
