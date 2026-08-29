"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Send, Star, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Order = { id: string; tracking_code: string | null; status: string; services?: { title?: string | null; icon?: string | null } | null };
type Message = { id: string; conversation_id: string; sender_id: string; sender_role: string; message: string; created_at: string };
type Conversation = { id: string; order_id: string | null; assignment_mode: string; assigned_staff_id: string | null; status: string };
type Agent = { full_name: string | null; staff_code: string };

const strengths = ["پاسخگویی سریع", "برخورد مناسب", "پیگیری خوب", "دقت و توجه", "تخصص", "توضیحات کامل"];
const weaknesses = ["پاسخگویی کند", "پیگیری ضعیف", "برخورد نامناسب", "اطلاعات ناقص", "عدم دقت", "تاخیر در پاسخ"];

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (open && userId && !surveyId) void loadConversation(userId);
  }, [open, userId, surveyId]);

  useEffect(() => {
    if (!open || !conversation?.id) return;
    const channel = supabase
      .channel(`support-customer-${conversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversation.id}` }, payload => {
        const message = payload.new as Message;
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_conversations", filter: `id=eq.${conversation.id}` }, payload => {
        const next = payload.new as Conversation;
        setConversation(next);
        if (next.status === "closed") {
          setSurveyId(next.id);
          setAgent(null);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [open, conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function loadOrders(id: string) {
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("id,tracking_code,status,services(title,icon)")
      .eq("user_id", id)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(30);
    if (queryError) throw queryError;
    setOrders((data ?? []) as Order[]);
  }

  async function loadConversation(id: string) {
    setLoading(true);
    setError("");
    try {
      const { data: current, error: conversationError } = await supabase
        .from("support_conversations")
        .select("id,order_id,assignment_mode,assigned_staff_id,status")
        .eq("user_id", id)
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conversationError) throw conversationError;
      if (!current) {
        setConversation(null);
        setMessages([]);
        setAgent(null);
        setChoosing(true);
        await loadOrders(id);
        return;
      }
      setConversation(current as Conversation);
      setChoosing(false);
      const { data: rows, error: messageError } = await supabase
        .from("support_messages")
        .select("id,conversation_id,sender_id,sender_role,message,created_at")
        .eq("conversation_id", current.id)
        .order("created_at", { ascending: true });
      if (messageError) throw messageError;
      setMessages((rows ?? []) as Message[]);
      if (current.assigned_staff_id) {
        const { data: staff } = await supabase.rpc("get_support_agent", { p_staff_id: current.assigned_staff_id });
        setAgent((staff?.[0] ?? null) as Agent | null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارتباط با پشتیبانی برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function startConversation(orderId: string | null) {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const { data: id, error: startError } = await supabase.rpc("start_support_conversation", { p_order_id: orderId });
      if (startError) throw startError;
      const { data: current, error: queryError } = await supabase
        .from("support_conversations")
        .select("id,order_id,assignment_mode,assigned_staff_id,status")
        .eq("id", id)
        .single();
      if (queryError) throw queryError;
      setConversation(current as Conversation);
      setMessages([]);
      setChoosing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "شروع گفتگو انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !conversation || sending) return;
    setSending(true);
    setError("");
    try {
      const { data: messageId, error: sendError } = await supabase.rpc("send_support_message", { p_conversation_id: conversation.id, p_message: text });
      if (sendError) throw sendError;
      const { data: message, error: messageError } = await supabase
        .from("support_messages")
        .select("id,conversation_id,sender_id,sender_role,message,created_at")
        .eq("id", messageId)
        .maybeSingle();
      if (messageError) throw messageError;
      if (message) setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message as Message]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setSending(false);
    }
  }

  async function closeConversation() {
    if (!conversation) return;
    const { error: closeError } = await supabase.rpc("close_support_conversation", { p_conversation_id: conversation.id });
    if (closeError) {
      setError(closeError.message);
      return;
    }
    setSurveyId(conversation.id);
    setConversation(null);
    setMessages([]);
    setAgent(null);
    setRating(0);
    setReviewSent(false);
  }

  async function submitReview() {
    if (!surveyId || rating < 1) return;
    setLoading(true);
    setError("");
    try {
      const { error: reviewError } = await supabase.rpc("submit_support_review", {
        p_conversation_id: surveyId,
        p_rating: rating,
        p_comment: comment,
        p_strengths: selectedStrengths,
        p_weaknesses: selectedWeaknesses,
      });
      if (reviewError) throw reviewError;
      setReviewSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت نظرسنجی انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(values: string[], setter: (value: string[]) => void, value: string) {
    setter(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }

  const selectedOrder = conversation?.order_id ? orders.find(order => order.id === conversation.order_id) : null;
  const headerText = agent ? `${agent.full_name || "پشتیبان"} · ${agent.staff_code}` : conversation?.assignment_mode === "order" ? "مسئول سفارش در جریان قرار گرفت" : "در انتظار اتصال اپراتور";

  return (
    <div className="fixed bottom-5 left-5 z-[60]" dir="rtl">
      {open && (
        <div className="mb-3 flex h-[min(650px,calc(100vh-110px))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl">
          <header className="flex items-center justify-between bg-[var(--primary)] px-5 py-4 text-white">
            <div>
              <div className="font-black">پشتیبانی آنلاین توسن</div>
              <div className="mt-1 text-xs text-white/75">{headerText}</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن"><X size={19} /></button>
          </header>

          {!userId && (
            <div className="flex flex-1 flex-col items-center justify-center p-7 text-center">
              <MessageCircle size={42} />
              <h3 className="mt-4 font-black">برای شروع گفتگو وارد شوید</h3>
              <Link href="/auth?mode=login" className="mt-5 rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white">ورود به حساب</Link>
            </div>
          )}

          {userId && surveyId && !reviewSent && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-center">
                <CheckCircle2 size={42} className="mx-auto" />
                <h3 className="mt-3 text-lg font-black">گفتگو به پایان رسید</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">تجربه خود از پشتیبانی را ارزیابی کنید.</p>
                <div className="mt-5 flex justify-center gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`امتیاز ${n}`}><Star size={30} fill={n <= rating ? "currentColor" : "none"} /></button>)}</div>
                <textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={1500} rows={4} placeholder="نظر شما..." className="mt-5 w-full rounded-2xl border p-3 text-sm" />
                <div className="mt-4 text-right"><div className="font-black text-sm">نقاط قوت</div><div className="mt-2 flex flex-wrap gap-2">{strengths.map(item => <button key={item} type="button" onClick={() => toggle(selectedStrengths, setSelectedStrengths, item)} className={`rounded-full border px-3 py-2 text-xs ${selectedStrengths.includes(item) ? "border-green-500 bg-green-500 text-white" : ""}`}>{item}</button>)}</div><div className="mt-4 font-black text-sm">نقاط ضعف</div><div className="mt-2 flex flex-wrap gap-2">{weaknesses.map(item => <button key={item} type="button" onClick={() => toggle(selectedWeaknesses, setSelectedWeaknesses, item)} className={`rounded-full border px-3 py-2 text-xs ${selectedWeaknesses.includes(item) ? "border-red-500 bg-red-500 text-white" : ""}`}>{item}</button>)}</div></div>
                <button type="button" disabled={rating < 1 || loading} onClick={() => void submitReview()} className="mt-5 w-full rounded-2xl bg-[var(--primary)] px-4 py-3 font-black text-white disabled:opacity-40">ثبت نظر و امتیاز</button>
                {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
              </div>
            </div>
          )}

          {userId && surveyId && reviewSent && (
            <div className="flex flex-1 flex-col items-center justify-center p-7 text-center">
              <CheckCircle2 size={50} />
              <h3 className="mt-4 font-black">ممنون از نظر شما</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">نظر شما برای مدیریت توسن ثبت شد.</p>
              <button type="button" onClick={() => { setReviewSent(false); setSurveyId(null); setChoosing(true); if (userId) void loadOrders(userId); }} className="mt-5 rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white">گفتگوی جدید</button>
            </div>
          )}

          {userId && !surveyId && choosing && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-center"><MessageCircle size={40} className="mx-auto" /><h3 className="mt-3 text-lg font-black">گفتگوی جدید</h3><p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">اگر مشکل مربوط به سفارش است آن را انتخاب کنید، در غیر این صورت گفتگوی عمومی را شروع کنید.</p></div>
              <div className="mt-5 space-y-2">{orders.map(order => <button key={order.id} type="button" onClick={() => void startConversation(order.id)} className="w-full rounded-2xl border p-4 text-right"><div className="font-black">{order.services?.icon} {order.services?.title || "خدمت"}</div><div className="mt-1 text-xs text-[var(--text-muted)]">کد پیگیری: {order.tracking_code || "---"}</div></button>)}</div>
              <button type="button" onClick={() => void startConversation(null)} className="mt-4 w-full rounded-2xl border border-dashed border-[var(--primary)] px-4 py-3 font-black text-[var(--primary)]">سفارش مرتبط ندارم / موضوع عمومی</button>
              {loading && <div className="py-3 text-center text-xs">در حال ایجاد گفتگو...</div>}
              {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
            </div>
          )}

          {userId && !surveyId && !choosing && conversation && (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {loading && messages.length === 0 ? <div className="py-10 text-center">در حال بارگذاری...</div> : messages.length === 0 ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">سلام 👋<br />پیام خود را بنویسید؛ پشتیبانی پاسخ می‌دهد.</div> : messages.map(message => <div key={message.id} className={`flex ${message.sender_role === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${message.sender_role === "user" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)]"}`}>{message.message}<div className="mt-1 text-[10px] opacity-60">{new Date(message.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
              </div>
              {selectedOrder && <div className="px-3 text-[11px] text-[var(--text-muted)]">سفارش: {selectedOrder.services?.title || "خدمت"} · {selectedOrder.tracking_code || "---"}</div>}
              {error && <div className="mx-3 mb-2 rounded-xl bg-red-500/10 p-2 text-center text-xs text-red-600">{error}</div>}
              <div className="border-t border-[var(--border)]"><div className="flex items-center justify-between px-3 py-2 text-[11px] text-[var(--text-muted)]"><span>{agent ? `پاسخگو: ${agent.full_name || "پشتیبان"} (${agent.staff_code})` : conversation.assignment_mode === "order" ? "مسئول سفارش در جریان قرار گرفت" : "در صف اتصال به اپراتور"}</span><button type="button" onClick={() => void closeConversation()} className="font-bold text-red-500">پایان گفتگو</button></div><form onSubmit={sendMessage} className="flex gap-2 p-3"><input value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} placeholder="پیام خود را بنویسید..." className="min-w-0 flex-1 rounded-2xl border p-3 text-sm outline-none" /><button type="submit" disabled={sending || !draft.trim()} className="rounded-2xl bg-[var(--primary)] p-3 text-white disabled:opacity-40" aria-label="ارسال پیام"><Send size={19} /></button></form></div>
            </>
          )}
        </div>
      )}
      <button type="button" onClick={() => setOpen(value => !value)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-xl" aria-label="پشتیبانی آنلاین"><MessageCircle size={26} /></button>
    </div>
  );
}
