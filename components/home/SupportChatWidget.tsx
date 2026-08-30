"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SupportMessage = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin" | "staff"; message: string; is_read: boolean; created_at: string };

export default function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id || null); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (mounted) setUserId(session?.user?.id || null); });
        return () => { mounted = false; subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (!open || !userId) return;
        void loadConversation(userId);
    }, [open, userId]);

    useEffect(() => {
        if (!conversationId) return;
        const channel = supabase.channel(`support-chat-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
            const next = payload.new as SupportMessage;
            setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
            if (next.sender_id !== userId) {
                if (open) void markConversationRead(conversationId);
                else setUnreadCount((count) => count + 1);
            }
        }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [conversationId, userId, open]);

    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open]);

    async function refreshUnreadCount(id: string) {
        const { data, error: rpcError } = await supabase.rpc("get_support_unread_count", { p_conversation_id: id });
        if (!rpcError && typeof data === "number") setUnreadCount(data);
    }

    async function markConversationRead(id: string) {
        const { error: rpcError } = await supabase.rpc("mark_support_messages_read", { p_conversation_id: id });
        if (!rpcError) setUnreadCount(0);
        else setError("وضعیت خوانده‌شدن پیام‌ها به‌روزرسانی نشد.");
    }

    async function findOpenConversation(id: string) {
        return supabase.from("support_conversations").select("id").eq("user_id", id).eq("status", "open").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    }

    async function loadConversation(id: string) {
        setLoading(true); setError(null);
        let currentId: string | null = null;
        const { data: existing, error: findError } = await findOpenConversation(id);
        if (findError) { setError("بارگذاری گفتگو انجام نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
        currentId = existing?.id || null;
        if (!currentId) {
            const { data: created, error: createError } = await supabase.rpc("start_support_conversation", { p_order_id: null });
            if (!createError && created) currentId = created as string;
            else {
                const retry = await findOpenConversation(id);
                if (retry.error || !retry.data?.id) { setError("ایجاد گفتگوی پشتیبانی انجام نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
                currentId = retry.data.id;
            }
        }
        if (!currentId) {
            setError("شناسه گفتگوی پشتیبانی دریافت نشد. لطفاً دوباره تلاش کنید.");
            setLoading(false);
            return;
        }
        const resolvedConversationId: string = currentId;
        setConversationId(resolvedConversationId);
        const { data, error: messageError } = await supabase.from("support_messages").select("id, conversation_id, sender_id, sender_role, message, is_read, created_at").eq("conversation_id", resolvedConversationId).order("created_at", { ascending: true }).limit(100);
        if (messageError) setError("بارگذاری پیام‌ها انجام نشد. لطفاً دوباره تلاش کنید.");
        else setMessages((data || []) as SupportMessage[]);
        setLoading(false);
        await refreshUnreadCount(resolvedConversationId);
        if (open) await markConversationRead(resolvedConversationId);
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !userId || !conversationId || sending) return;
        setSending(true); setError(null);
        const { error: rpcError } = await supabase.rpc("send_support_message", { p_conversation_id: conversationId, p_message: text });
        if (rpcError) setError("ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.");
        else setDraft("");
        setSending(false);
    }

    if (!userId) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50">
            {open ? (
                <div className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-background shadow-2xl">
                    <div className="flex items-center justify-between border-b p-3">
                        <div className="flex items-center gap-2 font-bold"><MessageCircle className="h-5 w-5" /> پشتیبانی آنلاین</div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="بستن"><X className="h-5 w-5" /></button>
                    </div>
                    <div ref={scrollRef} className="h-80 space-y-2 overflow-y-auto p-3">
                        {loading && <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>}
                        {!loading && messages.length === 0 && <p className="text-sm text-muted-foreground">پیامی وجود ندارد. پیام خود را ارسال کنید.</p>}
                        {messages.map((message) => (
                            <div key={message.id} className={`max-w-[85%] rounded-xl p-2 text-sm ${message.sender_id === userId ? "mr-auto bg-primary text-primary-foreground" : "ml-auto bg-muted"}`}>
                                {message.message}
                            </div>
                        ))}
                    </div>
                    {error && <p className="px-3 pb-2 text-xs text-destructive">{error}</p>}
                    <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
                        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="پیام شما..." className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" disabled={sending} />
                        <button type="submit" disabled={sending || !draft.trim()} aria-label="ارسال" className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
                    </form>
                </div>
            ) : (
                <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-primary p-4 text-primary-foreground shadow-lg" aria-label="پشتیبانی آنلاین">
                    <MessageCircle className="h-6 w-6" />
                    {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">{unreadCount}</span>}
                </button>
            )}
        </div>
    );
}
