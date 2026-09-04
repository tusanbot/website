"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(isStandalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferredPrompt || dismissed) return null;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-[88px] z-40 lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/85">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
          <Download size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">نصب اپلیکیشن توسن</p>
          <p className="mt-0.5 text-[11px] leading-5 text-[var(--text-muted)]">برای دسترسی سریع‌تر، توسن را روی گوشی نصب کنید.</p>
        </div>
        <button type="button" onClick={install} className="shrink-0 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-black text-white active:scale-95">نصب</button>
        <button type="button" aria-label="بستن پیام نصب" onClick={() => setDismissed(true)} className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--background)]">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
