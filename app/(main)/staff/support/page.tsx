"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader, TusanButton } from "@/components/ui";

type Conversation = { id: string; user_id: string; status: "open" | "closed"; order_id: string | null; assigned_staff_id: string | null; created_at: string; updated_at: string; profiles?: { full_name?: string | null; phone?: string | null } | null };
type Message = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin" | "staff"; message: string; is_read: boolean; created_at: string };

export default function StaffSupportPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => { void loadConversations(); }, []);
    useEffect(() => {
        if (!selected) return;
        void loadMessages(selected);
        const channel = supabase.channel(`staff-support-${selected}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selected}` }, (payload) => {
            const next = payload.new as Message;
            setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
        }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [selected]);

    async function loadConversations() {
        setLoading(true); setNotice("");
        const { data, error } = await supabase.from("support_conversations").select("id,user_id,status,order_id,assigned_staff_id,created_at,updated_at,profiles(full_name,phone)").eq("status", "open").order("updated_at", { ascending: false });
        if (error) setNotice(error.message);
        setConversations((data || []) as Conversation[]);
        setLoading(false);
    }

    async function loadMessages(id: string) {
        const { data, error } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", id).order("created_at", { ascending: true });
        if (error) setNotice(error.message); else setMessages((data || []) as Message[]);
    }

    async function claim(id: string) {
        setBusy(true); setNotice("");
        const { data, error } = await supabase.rpc("claim_support_conversation", { p_conversation_id: id });
        if (error) setNotice(error.message); else if (!data) setNotice("این گفتگو قبلاً توسط اپراتور دیگری دریافت شده است."); else { setSelected(id); setNotice("گفتگو با موفقیت به شما تخصیص یافت."); }
        await loadConversations(); setBusy(false);
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !selected) return;
        setBusy(true); setDraft(""); setNotice("");
        const { data, error } = await supabase.rpc("send_support_message", { p_conversation_id: selected, p_message: text });
        if (error) { setNotice(error.message); setDraft(text); } else if (data) await loadMessages(selected);
        setBusy(false);
    }

    const active = useMemo(() => conversations.find((item) => item.id === selected) || null, [conversations, selected]);
    const queue = conversations.filter((item) => !item.assigned_staff_id && !item.order_id);
    const mine = conversations.filter((item) => Boolean(item.assigned_staff_id));

    return (
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4"><SectionHeader title="پشتیبانی آنلاین" description="صف گفتگوهای عمومی و گفتگوهای تخصیص‌یافته به شما." /><TusanButton variant="secondary" onClick={() => void loadConversations()}>بروزرسانی</TusanButton></div>
            {notice && <GlassPanel className="border border-[var(--primary)]/20 p-4 text-sm">{notice}</GlassPanel>}
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <GlassPanel className="overflow-hidden p-0"><div className="border-b border-[var(--border)] p-4 font-black">صف پشتیبانی ({queue.length.toLocaleString("fa-IR")})</div><div className="max-h-[680px] overflow-y-auto">{loading ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری...</div> : conversations.length === 0 ? <div className="p-8 text-center text-sm text-[var(--text-muted)]">گفتگوی بازی وجود ندارد.</div> : conversations.map((item) => <div key={item.id} className={`border-b border-[var(--border)] p-4 ${selected === item.id ? "bg-[var(--primary)]/8" : ""}`}><button type="button" onClick={() => item.assigned_staff_id && setSelected(item.id)} className="w-full text-right"><div className="font-black">{item.profiles?.full_name || "کاربر"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{item.profiles?.phone || "بدون شماره"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{item.order_id ? "مرتبط با سفارش" : item.assigned_staff_id ? "تخصیص‌یافته" : "در صف"}</div></button>{!item.assigned_staff_id && !item.order_id && <TusanButton className="mt-3 w-full" size="sm" onClick={() => void claim(item.id)} disabled={busy}>پذیرش گفتگو</TusanButton>}</div>)}</div></GlassPanel>
                <GlassPanel className="flex min-h-[680px] flex-col overflow-hidden p-0"><div className="border-b border-[var(--border)] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageCircle size={20} /></span><div><div className="font-black">{active?.profiles?.full_name || "یک گفتگوی تخصیص‌یافته را انتخاب کنید"}</div><div className="text-xs text-[var(--text-muted)]">{active?.profiles?.phone || ""}</div></div></div></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{!selected ? <div className="flex h-full items-center justify-center text-[var(--text-muted)]">ابتدا یک گفتگو را از فهرست انتخاب کنید.</div> : messages.map((item) => <div key={item.id} className={`flex ${item.sender_role === "staff" || item.sender_role === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-2xl px-4 py-3 leading-7 ${item.sender_role === "staff" || item.sender_role === "admin" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)]"}`}>{item.message}<div className={`mt-1 text-[10px] ${item.sender_role === "staff" || item.sender_role === "admin" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}</div>{selected && <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3"><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پاسخ اپراتور..." className="flex-1 resize-none bg-transparent px-2 py-2 outline-none" /><button type="submit" disabled={busy || !draft.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40"><Send size={17} /></button></div></form>}</GlassPanel>
            </div>
            {mine.length > 0 && <div className="text-xs text-[var(--text-muted)]">گفتگوهای تخصیص‌یافته فعال: {mine.length.toLocaleString("fa-IR")}</div>}
        </main>
    );
}
