"use client";

import type { ReactNode } from "react";

type StatusKind = "not-found" | "error" | "maintenance";

type Props = {
  kind: StatusKind;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  icon?: ReactNode;
};

const content = {
  "not-found": {
    code: "404",
    title: "صفحه پیدا نشد",
    description: "این صفحه وجود ندارد یا ممکن است آدرس آن تغییر کرده باشد.",
    action: "بازگشت به صفحه اصلی",
  },
  error: {
    code: "500",
    title: "خطایی پیش آمد",
    description: "در پردازش درخواست مشکلی رخ داد. لطفاً دوباره تلاش کنید.",
    action: "تلاش دوباره",
  },
  maintenance: {
    code: "",
    title: "به‌زودی برمی‌گردیم",
    description: "سایت توسن در حال به‌روزرسانی و بهبود است. کمی دیگر دوباره سر بزنید.",
    action: "تلاش دوباره",
  },
} as const;

function BrandMark() {
  return (
    <div className="status-brand" aria-label="کافی‌نت توسن">
      <span className="status-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <path d="M14 9.5h20A4.5 4.5 0 0 1 38.5 14v20a4.5 4.5 0 0 1-4.5 4.5H14A4.5 4.5 0 0 1 9.5 34V14A4.5 4.5 0 0 1 14 9.5Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M17 25.5c2.8-4.8 5.6-7.2 8.4-7.2 2.3 0 3.9 1.2 5.6 3.6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M16.5 31h15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span>کافی‌نت توسن</span>
    </div>
  );
}

function StatusIllustration({ kind }: { kind: StatusKind }) {
  if (kind === "maintenance") {
    return (
      <svg className="status-illustration" viewBox="0 0 420 280" aria-hidden="true">
        <circle cx="210" cy="138" r="96" className="orbit orbit-a" />
        <circle cx="210" cy="138" r="72" className="orbit orbit-b" />
        <path d="M122 197h176" className="ground" />
        <rect x="157" y="91" width="106" height="76" rx="12" className="screen" />
        <rect x="169" y="103" width="82" height="52" rx="7" className="screen-inner" />
        <path d="M190 183h40M181 197h58" className="stand" />
        <path d="m297 92 18 18-50 50-24 7 7-24 49-51Z" className="tool" />
        <circle cx="311" cy="106" r="8" className="tool-dot" />
        <path d="m124 106 17-17 18 18-17 17z" className="spark" />
        <circle cx="116" cy="184" r="5" className="spark-dot" />
      </svg>
    );
  }

  return (
    <svg className="status-illustration" viewBox="0 0 420 280" aria-hidden="true">
      <circle cx="210" cy="140" r="100" className="orbit orbit-a" />
      <circle cx="210" cy="140" r="70" className="orbit orbit-b" />
      <path d="M120 204h180" className="ground" />
      <path d="M150 178 184 93l70 24 15 61Z" className="page-shape" />
      <path d="m184 93 70 24-20 23-69-24z" className="page-fold" />
      <path d="M178 143h58M172 159h42" className="page-line" />
      <circle cx="269" cy="91" r="28" className="bubble" />
      <path d="m259 91 8 8 14-17" className="check" />
      <circle cx="131" cy="112" r="5" className="spark-dot" />
      <path d="m294 175 10-10 10 10-10 10z" className="spark" />
    </svg>
  );
}

export default function SystemStatusPage({
  kind,
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  const defaults = content[kind];
  const isError = kind === "error";

  const handleAction = () => {
    if (isError) window.location.reload();
  };

  return (
    <main className="status-page">
      <div className="status-glow status-glow-a" />
      <div className="status-glow status-glow-b" />
      <div className="status-grid" aria-hidden="true" />

      <section className="status-card" aria-labelledby="status-title">
        <BrandMark />
        <div className="status-content">
          <StatusIllustration kind={kind} />
          {defaults.code && <div className="status-code">{defaults.code}</div>}
          <h1 id="status-title">{title ?? defaults.title}</h1>
          <p>{description ?? defaults.description}</p>
          <div className="status-actions">
            {actionHref && !isError ? (
              <a className="status-primary" href={actionHref}>{actionLabel ?? defaults.action}</a>
            ) : (
              <button className="status-primary" type="button" onClick={handleAction}>
                {actionLabel ?? defaults.action}
              </button>
            )}
            {secondaryHref && secondaryLabel && (
              <a className="status-secondary" href={secondaryHref}>{secondaryLabel}</a>
            )}
          </div>
        </div>
        <span className="status-footer">خدمات آنلاین، سریع و مطمئن</span>
      </section>

      <style jsx>{`
        .status-page {
          --status-primary: #09967c;
          --status-primary-dark: #087d69;
          --status-bg: #f5fbfa;
          --status-text: #111827;
          --status-muted: #64748b;
          min-height: 100svh;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 28px 18px;
          background: var(--status-bg);
          color: var(--status-text);
          isolation: isolate;
        }
        .status-card {
          width: min(100%, 720px);
          position: relative;
          z-index: 2;
          padding: 28px;
          border: 1px solid rgba(15, 23, 42, .08);
          border-radius: 32px;
          background: rgba(255,255,255,.86);
          box-shadow: 0 28px 80px rgba(15, 23, 42, .11);
          backdrop-filter: blur(18px);
          animation: status-in .5s cubic-bezier(.2,.8,.2,1) both;
          text-align: center;
        }
        .status-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--status-primary-dark);
          font-size: 15px;
          font-weight: 900;
        }
        .status-brand-mark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #fff;
          background: linear-gradient(135deg, var(--status-primary), var(--status-primary-dark));
          box-shadow: 0 10px 24px rgba(9,150,124,.22);
        }
        .status-brand-mark svg { width: 25px; height: 25px; }
        .status-content { display: grid; justify-items: center; }
        .status-illustration {
          width: min(100%, 360px);
          height: auto;
          margin: 8px auto -4px;
          overflow: visible;
        }
        .orbit { fill: none; stroke: rgba(9,150,124,.10); stroke-width: 1.5; stroke-dasharray: 5 9; transform-origin: 210px 140px; animation: orbit 18s linear infinite; }
        .orbit-b { animation-direction: reverse; animation-duration: 12s; stroke: rgba(14,165,163,.12); }
        .ground { stroke: rgba(15,23,42,.11); stroke-width: 2; stroke-linecap: round; }
        .screen { fill: rgba(9,150,124,.08); stroke: var(--status-primary); stroke-width: 3; }
        .screen-inner { fill: rgba(9,150,124,.12); }
        .stand { fill: none; stroke: var(--status-primary-dark); stroke-width: 4; stroke-linecap: round; }
        .tool { fill: none; stroke: var(--status-primary); stroke-width: 10; stroke-linejoin: round; }
        .tool-dot { fill: var(--status-primary-dark); }
        .spark { fill: rgba(9,150,124,.16); stroke: var(--status-primary); stroke-width: 2; }
        .spark-dot { fill: var(--status-primary); animation: pulse 2s ease-in-out infinite; }
        .page-shape { fill: rgba(255,255,255,.9); stroke: var(--status-primary); stroke-width: 3; stroke-linejoin: round; }
        .page-fold { fill: rgba(9,150,124,.09); }
        .page-line { fill: none; stroke: rgba(9,150,124,.5); stroke-width: 4; stroke-linecap: round; }
        .bubble { fill: #fff; stroke: var(--status-primary); stroke-width: 3; }
        .check { fill: none; stroke: var(--status-primary-dark); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
        .status-code {
          direction: ltr;
          margin-top: -8px;
          color: var(--status-primary);
          font: 900 clamp(3.4rem, 10vw, 5.2rem)/.9 var(--font-vazirmatn), sans-serif;
          letter-spacing: -.06em;
          opacity: .96;
        }
        h1 { margin: 14px 0 8px; font-size: clamp(1.55rem, 4vw, 2.2rem); line-height: 1.35; font-weight: 900; letter-spacing: -.02em; }
        p { max-width: 520px; margin: 0; color: var(--status-muted); font-size: clamp(.94rem, 2vw, 1.05rem); line-height: 1.95; }
        .status-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 24px; }
        .status-primary, .status-secondary {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 15px;
          font: 700 .95rem var(--font-vazirmatn), sans-serif;
          text-decoration: none;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .status-primary { border: 0; color: #fff; background: linear-gradient(135deg,var(--status-primary),var(--status-primary-dark)); box-shadow: 0 10px 24px rgba(9,150,124,.22); }
        .status-secondary { color: var(--status-primary-dark); border: 1px solid rgba(9,150,124,.16); background: rgba(9,150,124,.06); }
        .status-primary:hover, .status-secondary:hover { transform: translateY(-2px); }
        .status-primary:active, .status-secondary:active { transform: scale(.98); }
        .status-footer { display: block; margin-top: 22px; color: rgba(100,116,139,.72); font-size: 12px; }
        .status-glow { position: absolute; z-index: -1; border-radius: 999px; filter: blur(2px); pointer-events: none; }
        .status-glow-a { width: 340px; height: 340px; top: -170px; right: -90px; background: rgba(9,150,124,.12); }
        .status-glow-b { width: 300px; height: 300px; bottom: -160px; left: -100px; background: rgba(14,165,163,.10); }
        .status-grid { position: absolute; inset: 0; z-index: -1; opacity: .32; background-image: linear-gradient(rgba(9,150,124,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(9,150,124,.05) 1px, transparent 1px); background-size: 32px 32px; mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent); }
        @keyframes status-in { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes orbit { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: .45; transform: scale(.8); } 50% { opacity: 1; transform: scale(1.15); } }
        @media (max-width: 520px) { .status-page { padding: 14px; } .status-card { padding: 20px 16px 18px; border-radius: 26px; } .status-illustration { width: 300px; } .status-actions { width: 100%; } .status-primary, .status-secondary { width: 100%; } }
        @media (prefers-reduced-motion: reduce) { .status-card, .orbit, .spark-dot { animation: none !important; } .status-primary, .status-secondary { transition: none; } }
        @media (prefers-color-scheme: dark) {
          .status-page { --status-bg: #0f172a; --status-text: #f8fafc; --status-muted: #cbd5e1; }
          .status-card { background: rgba(15,23,42,.86); border-color: rgba(255,255,255,.08); box-shadow: 0 28px 80px rgba(0,0,0,.35); }
          .ground { stroke: rgba(255,255,255,.12); }
          .page-shape { fill: rgba(17,24,39,.92); }
          .status-footer { color: rgba(203,213,225,.62); }
        }
      `}</style>
    </main>
  );
}
