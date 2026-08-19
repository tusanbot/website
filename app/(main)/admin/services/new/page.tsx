"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewServiceLegacyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/services/new-service"); }, [router]);
  return <div dir="rtl" className="min-h-screen page-background flex items-center justify-center text-[var(--text)]">در حال انتقال به صفحه ایجاد خدمت...</div>;
}
