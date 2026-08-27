"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader } from "@/components/ui";

type Conversation = { id: string; user_id: string; status: "open" | "closed"; created_at: string; updated_at: string; profiles?: { full_name?: string | null; phone?: string | null } | null };
type Message = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin"; message: string; is_read: boolean; created_at: string };

export default function AdminSupportPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [adminId, setAdminId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;
            setAdminId(user.id);
            await loadConversations();
        }
        void init();
        const channel = supabase.channel("support-admin-list").on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => void loadConversations()).subscribe();
        return () => { mounted = false; void supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (!selected) return;
        void loadMessages(selected);
        const channel = supabase.channel(`support-admin-${selected}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selected}` }, (payload) => {
            const next = payload.new as Message;
            setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
        }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [selected]);

    async function loadConversations() {
        const { data } = await supabase.from("support_conversations").select("id,user_id,status,created_at,updated_at,profiles(full_name,phone)").eq("status", "open").order("updated_at", { ascending: false });
        const next = (data || []) as Conversation[];
        setConversations(next);
        if (!selected && next[0]) setSelected(next[0].id);
        setLoading(false);
    }

    async function loadMessages(conversationId: string) {
        const { data } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true });
        setMessages((data || []) as Message[]);
        await supabase.from("support_messages").update({ is_read: true }).eq("conversation_id", conversationId).eq("sender_role", "user");
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !selected || !adminId) return;
        setDraft("");
        const { data, error } = await supabase.from("support_messages").insert({ conversation_id: selected, sender_id: adminId, sender_role: "admin", message: text }).select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").single();
        if (!error && data) setMessages((current) => current.some((item) => item.id === data.id) ? current : [...current, data as Message]);
    }

    const active = useMemo(() => conversations.find((item) => item.id === selected) || null, [conversations, selected]);

    return (
        <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <SectionHeader title="پشتیبانی آنلاین" description="مدیریت گفت‌وگوهای زنده مشتریان با اپراتور توسن" />
                    <a href="/admin" className="text-sm font-bold text-[var(--primary)]">بازگشت به پنل ←</a>
                </div>
                <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
                    <GlassPanel className="overflow-hidden p-0">
                        <div className="border-b border-[var(--border)] p-4 font-black">گفتگوهای باز</div>
                        <div className="max-h-[680px] overflow-y-auto">
                            {loading ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری...</div> : conversations.length === 0 ? <div className="p-8 text-center text-sm leading-7 text-[var(--text-muted)]">گفتگوی بازی وجود ندارد.</div> : conversations.map((item) => (
                                <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`w-full border-b border-[var(--border)] p-4 text-right transition ${selected === item.id ? "bg-[var(--primary)]/8" : "hover:bg-[var(--surface-muted)]"}`}>
                                    <div className="font-black">{item.profiles?.full_name || "کاربر"}</div>
                                    <div className="mt-1 text-xs text-[var(--text-muted)]">{item.profiles?.phone || "بدون شماره"}</div>
                                    <div className="mt-2 text-xs text-[var(--text-muted)]">{new Date(item.updated_at).toLocaleString("fa-IR")}</div>
                                </button>
                            ))}
                        </div>
                    </GlassPanel>
                    <GlassPanel className="flex min-h-[680px] flex-col overflow-hidden p-0">
                        <div className="border-b border-[var(--border)] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageCircle size={20} /></span><div><div className="font-black">{active?.profiles?.full_name || "انتخاب گفتگو"}</div><div className="text-xs text-[var(--text-muted)]">{active?.profiles?.phone || ""}</div></div></div></div>
                        <div className="flex-1 space-y-3 overflow-y-auto p-5">
                            {!selected ? <div className="flex h-full items-center justify-center text-[var(--text-muted)]">یک گفتگو را انتخاب کنید.</div> : messages.map((item) => (
                                <div key={item.id} className={`flex ${item.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 leading-7 ${item.sender_role === "admin" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text)]"}`}>
                                        {item.message}
                                        <div className={`mt-1 text-[10px] ${item.sender_role === "admin" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {selected && <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3"><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پاسخ اپراتور..." className="flex-1 resize-none bg-transparent px-2 py-2 outline-none" /><button type="submit" disabled={!draft.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40"><Send size={17} /></button></div></form>}
                    </GlassPanel>
                </div>
            </div>
        </main>
    );
}
