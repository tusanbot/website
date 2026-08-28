"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X, ChevronLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Order = { id: string; tracking_code: string | null; status: string; price: number | null; created_at: string; services?: { title?: string | null; icon?: string | null } | null };
type SupportMessage = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin"; message: string; is_read: boolean; created_at: string };
type Conversation = { id: string; order_id: string | null; assignment_mode: "order" | "queue"; assigned_staff_id: string | null; status: "open" | "closed" };

export default function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [choosingOrder, setChoosingOrder] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const loadInFlightRef = useRef(false);
    const loadRequestRef = useRef(0);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id || null); }).catch(() => { if (mounted) setUserId(null); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (mounted) setUserId(session?.user?.id || null); });
        return () => { mounted = false; subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (!open || !userId) return;
        void loadConversation(userId);
    }, [open, userId]);

    useEffect(() => {
        if (!open || !conversation?.id) return;
        const channel = supabase.channel(`support-chat-${conversation.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
            const next = payload.new as SupportMessage;
            setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
        }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [open, conversation?.id]);

    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, open]);

    async function findOpenConversation(id: string) {
        const { data, error: queryError } = await supabase.from("support_conversations").select("id,order_id,assignment_mode,assigned_staff_id,status").eq("user_id", id).eq("status", "open").order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (queryError) throw queryError;
        return (data || null) as Conversation | null;
    }

    async function loadOrders(id: string) {
        const { data, error: orderError } = await supabase.from("orders").select("id,tracking_code,status,price,created_at,services(title,icon)").eq("user_id", id).order("created_at", { ascending: false }).limit(30);
        if (orderError) throw orderError;
        setOrders((data || []) as Order[]);
    }

    async function loadConversation(id: string) {
        if (loadInFlightRef.current) return;
        loadInFlightRef.current = true;
        const requestId = ++loadRequestRef.current;
        setLoading(true); setError("");
        try {
            const current = await findOpenConversation(id);
            if (!current) {
                setConversation(null); setMessages([]); setChoosingOrder(true);
                await loadOrders(id);
                return;
            }
            if (requestId !== loadRequestRef.current) return;
            const { data, error: messagesError } = await supabase.from("support_messages").select("id,conversation_id,sender_id,sender_role,message,is_read,created_at").eq("conversation_id", current.id).order("created_at", { ascending: true });
            if (messagesError) throw messagesError;
            setConversation(current); setMessages((data || []) as SupportMessage[]); setChoosingOrder(false);
        } catch (err) {
            console.error("[SupportChatWidget] load failed", err);
            if (requestId === loadRequestRef.current) { setConversation(null); setMessages([]); setError("ارتباط با بخش پشتیبانی برقرار نشد. لطفاً دوباره تلاش کنید."); }
        } finally {
            loadInFlightRef.current = false;
            if (requestId === loadRequestRef.current) setLoading(false);
        }
    }

    async function startConversation(orderId: string | null) {
        if (!userId) return;
        setLoading(true); setError("");
        try {
            const { data, error: rpcError } = await supabase.rpc("start_support_conversation", { p_order_id: orderId });
            if (rpcError) throw rpcError;
            const id = data as string;
            const { data: current, error: conversationError } = await supabase.from("support_conversations").select("id,order_id,assignment_mode,assigned_staff_id,status").eq("id", id).single();
            if (conversationError) throw conversationError;
            setConversation(current as Conversation); setMessages([]); setChoosingOrder(false);
        } catch (err) {
            console.error("[SupportChatWidget] start failed", err);
            setError("شروع گفتگو انجام نشد. لطفاً دوباره تلاش کنید.");
        } finally { setLoading(false); }
    }

    async function closeConversation() {
        if (!conversation) return;
        const { error: closeError } = await supabase.from("support_conversations").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", conversation.id);
        if (closeError) { setError("پایان گفتگو انجام نشد. لطفاً دوباره تلاش کنید."); return; }
        setConversation(null); setMessages([]); setChoosingOrder(true); setError("");
        if (userId) void loadOrders(userId);
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !userId || !conversation?.id || sending) return;
        setSending(true); setError("");
        const optimistic: SupportMessage = { id: `temp-${Date.now()}`, conversation_id: conversation.id, sender_id: userId, sender_role: "user", message: text, is_read: false, created_at: new Date().toISOString() };
        setMessages((current) => [...current, optimistic]); setDraft("");
        try {
            const { error: insertError } = await supabase.from("support_messages").insert({ conversation_id: conversation.id, sender_id: userId, sender_role: "user", message: text });
            if (insertError) throw insertError;
            setMessages((current) => current.filter((item) => item.id !== optimistic.id));
        } catch (err: any) {
            console.error("[SupportChatWidget] send failed", err);
            setMessages((current) => current.filter((item) => item.id !== optimistic.id));
            setDraft(text);
            setError(insertErrorMessage(err));
        } finally { setSending(false); }
    }

    function insertErrorMessage(err: any) {
        if (err?.code === "42501" || err?.status === 401 || err?.status === 403) return "اجازه ارسال پیام وجود ندارد. لطفاً یک‌بار از حساب خارج و دوباره وارد شوید.";
        if (err?.code === "23503") return "گفتگو دیگر معتبر نیست. لطفاً گفتگو را دوباره شروع کنید.";
        return "ارسال پیام انجام نشد. متن پیام حفظ شده است؛ دوباره روی ارسال بزنید.";
    }

    const selectedOrder = conversation?.order_id ? orders.find((item) => item.id === conversation.order_id) : null;

    return (
        <div className="fixed bottom-5 left-5 z-[60]" dir="rtl">
            {open && <div className="mb-3 flex h-[min(620px,calc(100vh-110px))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl">
                <div className="flex items-center justify-between bg-[var(--primary)] px-5 py-4 text-white">
                    <div><div className="font-black">پشتیبانی آنلاین توسن</div><div className="mt-1 text-xs text-white/75">{conversation?.assignment_mode === "order" ? `مرتبط با ${selectedOrder?.services?.title || "سفارش شما"}` : "در انتظار اتصال اپراتور"}</div></div>
                    <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-white/10" aria-label="بستن"><X size={19} /></button>
                </div>
                {!userId ? <div className="flex flex-1 flex-col items-center justify-center px-7 text-center"><MessageCircle size={42} className="text-[var(--primary)]" /><h3 className="mt-4 font-black">برای شروع گفتگو وارد شوید</h3><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">برای حفظ سابقه گفتگو ابتدا وارد حساب کاربری شوید.</p><Link href="/auth?mode=login" className="mt-5 rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white">ورود به حساب</Link></div> : choosingOrder ? <div className="flex flex-1 flex-col overflow-y-auto p-5">
                    <div className="text-center"><CheckCircle2 size={40} className="mx-auto text-[var(--primary)]" /><h3 className="mt-3 font-black text-lg">موضوع گفتگو را مشخص کنید</h3><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">اگر گفتگو درباره یک سفارش است، آن را انتخاب کنید تا مسئول همان سفارش مستقیماً به گفتگو متصل شود.</p></div>
                    <div className="mt-5 space-y-2">{orders.map((order) => <button key={order.id} type="button" onClick={() => void startConversation(order.id)} className="w-full rounded-2xl border border-[var(--border)] p-4 text-right hover:border-[var(--primary)] hover:bg-[var(--surface-muted)]"><div className="font-black">{order.services?.icon} {order.services?.title || "خدمت"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">کد پیگیری: {order.tracking_code || "---"} · {new Date(order.created_at).toLocaleDateString("fa-IR")}</div></button>)}</div>
                    <button type="button" onClick={() => void startConversation(null)} className="mt-4 rounded-2xl border border-dashed border-[var(--primary)]/50 px-4 py-3 font-black text-[var(--primary)]">سفارش مرتبط ندارم / موضوع عمومی</button>
                    {loading && <div className="py-3 text-center text-xs text-[var(--text-muted)]">در حال ایجاد گفتگو...</div>}
                    {error && <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-center text-xs leading-6 text-red-600">{error}</div>}
                </div> : <>
                    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                        {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری گفتگو...</div> : error && messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center px-5 text-center"><MessageCircle size={38} className="text-[var(--primary)]" /><p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{error}</p><button type="button" onClick={() => void loadConversation(userId)} className="mt-4 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-black text-white">تلاش مجدد</button></div> : messages.length === 0 ? <div className="py-10 text-center text-sm leading-7 text-[var(--text-muted)]">سلام 👋<br />پیام خود را بنویسید؛ اپراتور توسن پاسخ می‌دهد.</div> : messages.map((item) => <div key={item.id} className={`flex ${item.sender_role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${item.sender_role === "user" ? "bg-[var(--primary)] text-white rounded-bl-md" : "bg-[var(--surface-muted)] text-[var(--text)] rounded-br-md"}`}>{item.message}<div className={`mt-1 text-[10px] ${item.sender_role === "user" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
                    </div>
                    {error && <div className="mx-3 mb-2 rounded-xl bg-red-500/10 p-2 text-center text-xs leading-6 text-red-600">{error}</div>}
                    <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-muted)]"><span>{conversation.assignment_mode === "order" ? "مسئول سفارش متصل است" : conversation.assigned_staff_id ? "اپراتور متصل است" : "در صف انتظار اتصال"}</span><button type="button" onClick={() => void closeConversation()} className="font-bold text-red-500">پایان گفتگو</button></div>
                    <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3"><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پیام شما..." className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text)] outline-none" /><button type="submit" disabled={!draft.trim() || sending || !conversation.id} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40" aria-label="ارسال"><Send size={17} /></button></div></form>
                </>}
            </div>}
            <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 font-black text-white shadow-[0_14px_40px_rgba(9,150,124,0.3)] transition hover:-translate-y-1" aria-label="پشتیبانی آنلاین"><MessageCircle size={20} /><span className="hidden sm:inline">پشتیبانی آنلاین</span></button>
        </div>
    );
}
