"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TusanButton } from "@/components/ui";

export default function LogoutButton({ className = "", onComplete }: { className?: string; onComplete?: () => void }) {
    const router = useRouter();

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("خطا در خروج از حساب:", error);
            return;
        }
        onComplete?.();
        router.push("/auth?mode=login");
        router.refresh();
    }

    return (
        <TusanButton type="button" variant="danger" fullWidth className={className} onClick={handleLogout}>
            <LogOut size={18} />
            خروج از حساب
        </TusanButton>
    );
}
