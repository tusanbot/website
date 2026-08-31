"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SupportMessage = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin" | "staff"; message: string; is_read: boolean; created_at: string };
type UserOrder = { id: string; tracking_code: string | null; status: string; created_at: string };

export default function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [orders, setOrders] = useState<UserOrder[]>([]);
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
        void loadOrders(userId);
    }, [open, userId]);

    useEffect(() => {
        if (!open || !userId) return;
        void loadConversation(userId, selectedOrderId || null);
    }, [open, userId, selectedOrderId]);

    useEffect(() => {
        if (!conversationId) return;
        const activeConversationId = conversationId;
        const channel = supabase.channel(`support-chat-${activeConversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
            const next = payload.new as SupportMessage;
            setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
            if (next.sender_id !== userId) { if (open) void markConversationRead(activeConversationId); else setUnreadCount((count) => count + 1); }
        }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [conversationId, userId, open]);

    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open]);

    async function loadOrders(id: string) {
        const { data, error: queryError } = await supabase.from("orders").select("id,tracking_code,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50);
        if (queryError) { console.error(queryError); setOrders([]); return; }
        setOrders((data || []) as UserOrder[]);
    }

    async function refreshUnreadCount(id: string) {
        const { data, error: rpcError } = await supabase.rpc("get_support_unread_count", { p_conversation_id: id });
        if (!rpcError && typeof data === "number") setUnreadCount(data);
    }
    async function markConversationRead(id: string) {
        const { error: rpcError } = await supabase.rpc("mark_support_messages_read", { p_conversation_id: id });
        if (!rpcError) setUnreadCount(0); else setError("وضعیت خوانده‌شدن پیام‌ها به‌روزرسانی نشد.");
    }

    async function findConversation(id: string, orderId: string | null) {
        let query = supabase.from("support_conversations").select("id").eq("user_id", id).eq("status", "open");
        query = orderId ? query.eq("order_id", orderId) : query.is("order_id", null);
        return query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
    }

    async function loadConversation(id: string, orderId: string | null) {
        setLoading(true); setError(null); setMessages([]); setConversationId(null);
        const { data: existing, error: findError } = await findConversation(id, orderId);
        if (findError) { console.error(findError); setError("بارگذاری گفتگو انجام نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
        let currentId: string | null = existing?.id || null;
        if (!currentId) {
            const { data: created, error: createError } = await supabase.rpc("start_support_conversation", { p_order_id: orderId });
            if (!createError && created) currentId = created as string;
            else {
                console.error(createError);
                const retry = await findConversation(id, orderId);
                if (retry.error || !retry.data?.id) { setError(createError?.message || "ایجاد گفتگوی پشتیبانی انجام نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
                currentId = retry.data.id;
            }
        }
        if (!currentId) { setError("شناسه گفتگوی پشتیبانی دریافت نشد. لطفاً دوباره تلاش کنید."); setLoading(false); return; }
        setConversationId(currentId);
        const { data, error: messageError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", currentId).order("created_at", { ascending: true }).limit(100);
        if (messageError) { console.error(messageError); setError("بارگذاری پیام‌ها انجام نشد. لطفاً دوباره تلاش کنید."); }
        else setMessages((data || []) as SupportMessage[]);
        setLoading(false);
        await refreshUnreadCount(currentId);
        if (open) await markConversationRead(currentId);
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault(); const text = draft.trim(); if (!text || !userId || !conversationId || sending) return;
        setSending(true); setError(null);
        const { data: messageId, error: rpcError } = await supabase.rpc("send_support_message", { p_conversation_id: conversationId, p_message: text });
        if (rpcError || !messageId) { console.error(rpcError); setError(rpcError?.message || "ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید."); setSending(false); return; }
        const { data: message, error: fetchError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("id", messageId).maybeSingle();
        if (fetchError || !message) { setError("پیام ارسال شد، اما نمایش آن انجام نشد. لطفاً گفتگو را تازه کنید."); }
        else { setDraft(""); setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message as SupportMessage]); }
        setSending(false);
    }

    return <div className="fixed bottom-5 left-5 z-[60]" dir="rtl">
        {open && <div className="mb-3 flex h-[min(620px,calc(100vh-110px))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl">
            <div className="flex items-center justify-between bg-[var(--primary)] px-5 py-4 text-white"><div><div className="font-black">پشتیبانی آنلاین توسن</div><div className="mt-1 text-xs text-white/75">گفتگو مستقیم با اپراتور</div></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-white/10" aria-label="بستن"><X size={19} /></button></div>
            {!userId ? <div className="flex flex-1 flex-col items-center justify-center px-7 text-center"><MessageCircle size={42} className="text-[var(--primary)]" /><h3 className="mt-4 font-black text-[var(--text)]">برای شروع گفتگو وارد شوید</h3><p className="mt-2 leading-7 text-sm text-[var(--text-muted)]">برای اینکه سابقه گفتگو و پاسخ اپراتور در حساب شما باقی بماند، ابتدا وارد حساب کاربری شوید.</p><Link href="/auth?mode=login" className="mt-5 rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white">ورود به حساب</Link></div> : <>
                {orders.length > 0 && <div className="border-b border-[var(--border)] p-3"><label className="mb-1 block text-xs font-bold text-[var(--text-muted)]">موضوع گفتگو / سفارش</label><select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none"><option value="">گفتگوی عمومی</option>{orders.map((order) => <option key={order.id} value={order.id}>{order.tracking_code || order.id.slice(0, 8)} — {new Date(order.created_at).toLocaleDateString("fa-IR")}</option>)}</select></div>}
                {error && <div role="alert" className="mx-3 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs">{error}</div>}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">{loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری گفتگو...</div> : messages.length === 0 ? <div className="py-10 text-center text-sm leading-7 text-[var(--text-muted)]">سلام 👋<br />پیام خود را بنویسید؛ اپراتور توسن در ساعات پشتیبانی پاسخ می‌دهد.</div> : messages.map((item) => <div key={item.id} className={`flex ${item.sender_role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${item.sender_role === "user" ? "bg-[var(--primary)] text-white rounded-bl-md" : "bg-[var(--surface-muted)] text-[var(--text)] rounded-br-md"}`}>{item.message}<div className={`mt-1 text-[10px] ${item.sender_role === "user" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}</div>
                <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3"><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پیام شما..." className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text)] outline-none" /><button type="submit" disabled={!draft.trim() || sending || !conversationId} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40" aria-label="ارسال"><Send size={17} /></button></div></form>
            </>}
        </div>}
        <button type="button" onClick={() => setOpen((value) => !value)} className="relative flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 font-black text-white shadow-[0_14px_40px_rgba(9,150,124,0.3)] transition hover:-translate-y-1" aria-label="پشتیبانی آنلاین"><MessageCircle size={20} /><span className="hidden sm:inline">پشتیبانی آنلاین</span>{!open && unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
    </div>;
}