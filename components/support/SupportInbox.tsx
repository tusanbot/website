"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { GlassPanel, SectionHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type Conversation = { id: string; user_id: string; status: "open" | "closed"; created_at: string; updated_at: string; profiles?: { full_name?: string | null; phone?: string | null } | null };
type Message = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin" | "staff"; message: string; is_read: boolean; created_at: string };
const PAGE_SIZE = 50;

export default function SupportInbox({ backHref, backLabel = "بازگشت به پنل ←" }: { backHref?: string; backLabel?: string }) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [oldestAt, setOldestAt] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted) return;
            if (!user) { setError("دسترسی به حساب کاربری امکان‌پذیر نیست."); setLoading(false); return; }
            await loadConversations();
        }
        void init();
        const channel = supabase.channel("support-inbox-list")
            .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => void loadConversations())
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, (payload) => { const next = payload.new as Message; void refreshUnreadCount(next.conversation_id); })
            .subscribe();
        return () => { mounted = false; void supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (!selected) return;
        let mounted = true;
        const channel = supabase.channel(`support-inbox-${selected}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selected}` }, (payload) => {
                if (!mounted) return;
                const next = payload.new as Message;
                setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
                if (next.sender_role === "user") void markConversationRead(selected);
            }).subscribe();
        void loadMessages(selected);
        return () => { mounted = false; void supabase.removeChannel(channel); };
    }, [selected]);

    async function refreshUnreadCount(conversationId: string) {
        const { data, error: queryError } = await supabase.rpc("get_support_unread_count", { p_conversation_id: conversationId });
        if (!queryError && typeof data === "number") setUnreadCounts((current) => ({ ...current, [conversationId]: data }));
    }
    async function markConversationRead(conversationId: string) {
        const { error: rpcError } = await supabase.rpc("mark_support_messages_read", { p_conversation_id: conversationId });
        if (rpcError) { setError("پیام‌ها نمایش داده شدند، اما وضعیت خوانده‌شدن به‌روزرسانی نشد."); return; }
        setUnreadCounts((current) => ({ ...current, [conversationId]: 0 }));
    }
    async function loadConversations() {
        const { data, error: queryError } = await supabase.from("support_conversations").select("id,user_id,status,created_at,updated_at,profiles!support_conversations_user_id_fkey(full_name,phone)").eq("status", "open").order("updated_at", { ascending: false });
        if (queryError) { console.error(queryError); setError("بارگذاری گفتگوها انجام نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
        const next = (data || []) as Conversation[];
        setConversations(next);
        setSelected((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
        setLoading(false);
        await Promise.all(next.map((item) => refreshUnreadCount(item.id)));
    }
    async function loadMessages(conversationId: string) {
        setMessagesLoading(true); setError(null);
        const { data, error: queryError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(PAGE_SIZE + 1);
        if (queryError) { console.error(queryError); setError("بارگذاری پیام‌ها انجام نشد. لطفاً دوباره تلاش کنید."); setMessagesLoading(false); return; }
        const rows = (data || []) as Message[]; const page = rows.slice(0, PAGE_SIZE).reverse();
        setMessages(page); setHasMore(rows.length > PAGE_SIZE); setOldestAt(page[0]?.created_at ?? null); setMessagesLoading(false); await markConversationRead(conversationId);
    }
    async function loadOlderMessages() {
        if (!selected || !oldestAt || !hasMore || messagesLoading) return;
        setMessagesLoading(true);
        const { data, error: queryError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", selected).lt("created_at", oldestAt).order("created_at", { ascending: false }).limit(PAGE_SIZE + 1);
        if (queryError) { setError("بارگذاری پیام‌های قدیمی انجام نشد."); setMessagesLoading(false); return; }
        const rows = (data || []) as Message[]; const page = rows.slice(0, PAGE_SIZE).reverse();
        setMessages((current) => [...page, ...current.filter((item) => !page.some((older) => older.id === item.id))]); setHasMore(rows.length > PAGE_SIZE); setOldestAt(page[0]?.created_at ?? oldestAt); setMessagesLoading(false);
    }
    async function sendMessage(event: React.FormEvent) {
        event.preventDefault(); const text = draft.trim(); if (!text || !selected || sending) return;
        setSending(true); setError(null);
        const { data: messageId, error: rpcError } = await supabase.rpc("send_support_message", { p_conversation_id: selected, p_message: text });
        if (rpcError || !messageId) { console.error(rpcError); setError(rpcError?.message || "ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید."); setSending(false); return; }
        const { data: message, error: fetchError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("id", messageId).maybeSingle();
        if (fetchError || !message) setError("پیام ارسال شد، اما بارگذاری آن در پنل انجام نشد.");
        else { setDraft(""); setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message as Message]); }
        setSending(false);
    }
    const active = useMemo(() => conversations.find((item) => item.id === selected) || null, [conversations, selected]);
    return <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]"><div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4"><SectionHeader title="پشتیبانی آنلاین" description="مدیریت گفت‌وگوهای زنده مشتریان با اپراتور توسن" />{backHref && <a href={backHref} className="text-sm font-bold text-[var(--primary)]">{backLabel}</a>}</div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]"><GlassPanel className="overflow-hidden p-0"><div className="border-b border-[var(--border)] p-4 font-black">گفتگوهای باز</div><div className="max-h-[680px] overflow-y-auto">{loading ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری...</div> : conversations.length === 0 ? <div className="p-8 text-center text-sm leading-7 text-[var(--text-muted)]">گفتگوی بازی وجود ندارد.</div> : conversations.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={`w-full border-b border-[var(--border)] p-4 text-right transition ${selected === item.id ? "bg-[var(--primary)]/8" : "hover:bg-[var(--surface-muted)]"}`}><div className="flex items-center justify-between gap-2"><div className="font-black">{item.profiles?.full_name || "کاربر"}</div>{(unreadCounts[item.id] || 0) > 0 && <span className="min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-[10px] font-black text-white">{unreadCounts[item.id] > 99 ? "99+" : unreadCounts[item.id]}</span>}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{item.profiles?.phone || "بدون شماره"}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{new Date(item.updated_at).toLocaleString("fa-IR")}</div></button>)}</div></GlassPanel>
        <GlassPanel className="flex min-h-[680px] flex-col overflow-hidden p-0"><div className="border-b border-[var(--border)] p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><MessageCircle size={20} /></span><div><div className="font-black">{active?.profiles?.full_name || "انتخاب گفتگو"}</div><div className="text-xs text-[var(--text-muted)]">{active?.profiles?.phone || ""}</div></div></div></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{selected && hasMore && <button type="button" onClick={() => void loadOlderMessages()} disabled={messagesLoading} className="mx-auto block text-xs font-bold text-[var(--primary)] disabled:opacity-50">{messagesLoading ? "در حال بارگذاری..." : "نمایش پیام‌های قدیمی‌تر"}</button>}{!selected ? <div className="flex h-full items-center justify-center text-[var(--text-muted)]">یک گفتگو را انتخاب کنید.</div> : messagesLoading && messages.length === 0 ? <div className="flex h-full items-center justify-center text-[var(--text-muted)]">در حال بارگذاری پیام‌ها...</div> : messages.map((item) => <div key={item.id} className={`flex ${item.sender_role === "admin" || item.sender_role === "staff" ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-2xl px-4 py-3 leading-7 ${item.sender_role === "admin" || item.sender_role === "staff" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text)]"}`}>{item.message}<div className={`mt-1 text-[10px] ${item.sender_role === "admin" || item.sender_role === "staff" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}</div>{selected && <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3"><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پاسخ اپراتور..." className="flex-1 resize-none bg-transparent px-2 py-2 outline-none" /><button type="submit" disabled={!draft.trim() || sending} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40"><Send size={17} /></button></div></form>}</GlassPanel></div>
    </div></main>;
}