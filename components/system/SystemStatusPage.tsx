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
    title: "صفحه موردنظر پیدا نشد",
    description: "به نظر می‌رسد این صفحه دیگر وجود ندارد یا نشانی آن تغییر کرده است.",
    action: "بازگشت به صفحه اصلی",
    image: "https://unpkg.com/undraw-svg@1.0.0/svgs/page-not-found.svg",
    alt: "تصویر صفحه پیدا نشد",
  },
  error: {
    title: "مشکلی در سایت پیش آمد",
    description: "در پردازش درخواست مشکلی رخ داده است. لطفاً یک بار دیگر تلاش کنید.",
    action: "تلاش دوباره",
    image: "https://unpkg.com/undraw-svg@1.0.0/svgs/server-error.svg",
    alt: "تصویر خطای فنی سرور",
  },
  maintenance: {
    title: "سایت در حال به‌روزرسانی است",
    description: "در حال انجام چند بهبود و به‌روزرسانی هستیم. کمی دیگر دوباره به ما سر بزنید.",
    action: "بازگشت به سایت",
    image: "https://unpkg.com/undraw-svg@1.0.0/svgs/maintenance.svg",
    alt: "تصویر در حال به‌روزرسانی سایت",
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

function StatusIllustration({ kind, alt, src }: { kind: StatusKind; alt: string; src: string }) {
  return (
    <div className={`status-visual status-visual-${kind}`} aria-hidden="false">
      <div className="visual-halo visual-halo-a" />
      <div className="visual-halo visual-halo-b" />
      <img
        className="status-image"
        src={src}
        alt={alt}
        width={560}
        height={420}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <span className="visual-orbit visual-orbit-a" aria-hidden="true" />
      <span className="visual-orbit visual-orbit-b" aria-hidden="true" />
    </div>
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
      <div className="status-glow status-glow-a" aria-hidden="true" />
      <div className="status-glow status-glow-b" aria-hidden="true" />
      <div className="status-grid" aria-hidden="true" />

      <section className="status-card" aria-labelledby="status-title">
        <div className="status-topbar">
          <BrandMark />
          <span className="status-dot" aria-label="وضعیت فعال" />
        </div>

        <div className="status-layout">
          <div className="status-visual-column">
            <StatusIllustration kind={kind} src={defaults.image} alt={defaults.alt} />
          </div>

          <div className="status-content">
            <span className="status-eyebrow">
              {kind === "maintenance" ? "یک وقفه کوتاه" : kind === "error" ? "نگران نباشید" : "مسیر اشتباه"}
            </span>
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
        </div>

        <span className="status-footer">سریع • مطمئن • همراه شما</span>
      </section>

      <style jsx>{`
        .status-page {
          --status-primary: #09967c;
          --status-primary-dark: #087d69;
          --status-bg: #f4fbf9;
          --status-text: #102a2a;
          --status-muted: #607575;
          min-height: 100svh;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at 18% 15%, rgba(9,150,124,.10), transparent 28%),
            radial-gradient(circle at 86% 82%, rgba(14,165,163,.08), transparent 30%),
            var(--status-bg);
          color: var(--status-text);
          isolation: isolate;
        }

        .status-card {
          width: min(1180px, 100%);
          position: relative;
          z-index: 2;
          padding: 26px 34px 20px;
          border: 1px solid rgba(15, 23, 42, .07);
          border-radius: 34px;
          background: rgba(255,255,255,.90);
          box-shadow: 0 28px 90px rgba(15, 23, 42, .10);
          backdrop-filter: blur(18px);
          animation: status-in .5s cubic-bezier(.2,.8,.2,1) both;
        }

        .status-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 42px;
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
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #fff;
          background: linear-gradient(135deg, var(--status-primary), var(--status-primary-dark));
          box-shadow: 0 10px 24px rgba(9,150,124,.22);
        }

        .status-brand-mark svg { width: 26px; height: 26px; }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--status-primary);
          box-shadow: 0 0 0 7px rgba(9,150,124,.09);
          animation: pulse 2.4s ease-in-out infinite;
        }

        .status-layout {
          min-height: 520px;
          display: grid;
          grid-template-columns: minmax(420px, 1.05fr) minmax(360px, .95fr);
          align-items: center;
          gap: clamp(30px, 6vw, 90px);
          padding: 14px 12px 8px;
        }

        .status-visual-column {
          min-width: 0;
          display: grid;
          place-items: center;
        }

        .status-visual {
          width: min(100%, 560px);
          aspect-ratio: 4 / 3;
          position: relative;
          display: grid;
          place-items: center;
          isolation: isolate;
        }

        .status-image {
          width: 84%;
          height: 84%;
          object-fit: contain;
          position: relative;
          z-index: 3;
          filter: drop-shadow(0 20px 28px rgba(9,150,124,.10));
          animation: float-image 4.8s ease-in-out infinite;
        }

        .visual-halo {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .visual-halo-a {
          width: 68%;
          height: 68%;
          background: rgba(9,150,124,.08);
          filter: blur(2px);
          z-index: 0;
        }

        .visual-halo-b {
          width: 48%;
          height: 48%;
          border: 1px solid rgba(9,150,124,.13);
          z-index: 1;
        }

        .visual-orbit {
          position: absolute;
          border: 1px dashed rgba(9,150,124,.18);
          border-radius: 50%;
          pointer-events: none;
        }

        .visual-orbit-a {
          width: 86%;
          height: 86%;
          animation: spin 18s linear infinite;
        }

        .visual-orbit-b {
          width: 72%;
          height: 72%;
          animation: spin-reverse 13s linear infinite;
        }

        .status-content {
          max-width: 520px;
          text-align: right;
          justify-self: center;
        }

        .status-eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(9,150,124,.08);
          color: var(--status-primary-dark);
          font-size: 12px;
          font-weight: 800;
        }

        h1 {
          margin: 18px 0 12px;
          font-size: clamp(2rem, 4vw, 3.45rem);
          line-height: 1.3;
          font-weight: 950;
          letter-spacing: -.035em;
        }

        p {
          max-width: 500px;
          margin: 0;
          color: var(--status-muted);
          font-size: clamp(1rem, 1.8vw, 1.12rem);
          line-height: 2;
        }

        .status-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          gap: 10px;
          margin-top: 28px;
        }

        .status-primary, .status-secondary {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 22px;
          border-radius: 16px;
          font: 800 .96rem var(--font-vazirmatn), sans-serif;
          text-decoration: none;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .status-primary {
          border: 0;
          color: #fff;
          background: linear-gradient(135deg,var(--status-primary),var(--status-primary-dark));
          box-shadow: 0 12px 26px rgba(9,150,124,.22);
        }

        .status-secondary {
          color: var(--status-primary-dark);
          border: 1px solid rgba(9,150,124,.15);
          background: rgba(9,150,124,.05);
        }

        .status-primary:hover, .status-secondary:hover { transform: translateY(-2px); }
        .status-primary:active, .status-secondary:active { transform: scale(.98); }

        .status-footer {
          display: block;
          padding-top: 17px;
          border-top: 1px solid rgba(15,23,42,.06);
          color: rgba(96,117,117,.72);
          font-size: 12px;
          text-align: center;
        }

        .status-glow {
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          pointer-events: none;
        }

        .status-glow-a { width: 420px; height: 420px; top: -220px; right: -120px; background: rgba(9,150,124,.12); filter: blur(4px); }
        .status-glow-b { width: 360px; height: 360px; bottom: -210px; left: -120px; background: rgba(14,165,163,.10); filter: blur(4px); }

        .status-grid {
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: .24;
          background-image: linear-gradient(rgba(9,150,124,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(9,150,124,.05) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
        }

        @keyframes status-in { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes float-image { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-reverse { to { transform: rotate(-360deg); } }
        @keyframes pulse { 0%,100% { opacity: .45; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.1); } }

        @media (max-width: 900px) {
          .status-card { padding-inline: 24px; }
          .status-layout {
            grid-template-columns: 1fr;
            min-height: auto;
            gap: 6px;
            padding-top: 8px;
          }
          .status-visual { max-width: 480px; }
          .status-content { width: min(100%, 620px); text-align: center; }
          .status-actions { justify-content: center; }
          .status-content p { margin-inline: auto; }
        }

        @media (max-width: 520px) {
          .status-page { padding: 12px; }
          .status-card { padding: 18px 15px 15px; border-radius: 26px; }
          .status-layout { padding-inline: 0; }
          .status-visual { width: 100%; aspect-ratio: 1 / .82; }
          .status-image { width: 88%; height: 88%; }
          h1 { font-size: 1.7rem; }
          p { font-size: .94rem; line-height: 1.9; }
          .status-actions { width: 100%; }
          .status-primary, .status-secondary { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .status-card, .status-image, .visual-orbit, .status-dot { animation: none !important; }
          .status-primary, .status-secondary { transition: none; }
        }

        @media (prefers-color-scheme: dark) {
          .status-page { --status-bg: #0d1918; --status-text: #f3fbfa; --status-muted: #c4d7d4; }
          .status-card { background: rgba(15,31,30,.90); border-color: rgba(255,255,255,.07); box-shadow: 0 28px 90px rgba(0,0,0,.35); }
          .status-footer { border-color: rgba(255,255,255,.07); color: rgba(196,215,212,.60); }
        }
      `}</style>
    </main>
  );
}
