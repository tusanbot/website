"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type SupportMessage = { id: string; conversation_id: string; sender_id: string; sender_role: "user" | "admin"; message: string; is_read: boolean; created_at: string };

export default function SupportChatWidget() {
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let mounted = true;
        supabase.auth.getUser().then(({ data }) => {
            if (mounted) setUserId(data.user?.id || null);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setUserId(session?.user?.id || null);
        });
        return () => { mounted = false; subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
        if (!open || !userId) return;
        void loadConversation(userId);
    }, [open, userId]);

    useEffect(() => {
        if (!conversationId) return;
        const channel = supabase
            .channel(`support-chat-${conversationId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
                const next = payload.new as SupportMessage;
                setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
            })
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [conversationId]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, open]);

    async function loadConversation(id: string) {
        setLoading(true);
        const { data: existing } = await supabase
            .from("support_conversations")
            .select("id")
            .eq("user_id", id)
            .eq("status", "open")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        let currentId = existing?.id || null;
        if (!currentId) {
            const { data: created } = await supabase
                .from("support_conversations")
                .insert({ user_id: id })
                .select("id")
                .single();
            currentId = created?.id || null;
        }

        setConversationId(currentId);
        if (currentId) {
            const { data } = await supabase
                .from("support_messages")
                .select("id, conversation_id, sender_id, sender_role, message, is_read, created_at")
                .eq("conversation_id", currentId)
                .order("created_at", { ascending: true });
            setMessages((data || []) as SupportMessage[]);
        }
        setLoading(false);
    }

    async function sendMessage(event: React.FormEvent) {
        event.preventDefault();
        const text = draft.trim();
        if (!text || !userId || !conversationId || sending) return;
        setSending(true);
        const optimistic: SupportMessage = { id: `temp-${Date.now()}`, conversation_id: conversationId, sender_id: userId, sender_role: "user", message: text, is_read: false, created_at: new Date().toISOString() };
        setMessages((current) => [...current, optimistic]);
        setDraft("");
        const { error } = await supabase.from("support_messages").insert({ conversation_id: conversationId, sender_id: userId, sender_role: "user", message: text });
        if (error) setMessages((current) => current.filter((item) => item.id !== optimistic.id));
        else setMessages((current) => current.filter((item) => item.id !== optimistic.id));
        setSending(false);
    }

    return (
        <div className="fixed bottom-5 left-5 z-[60]" dir="rtl">
            {open && (
                <div className="mb-3 flex h-[min(620px,calc(100vh-110px))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-2xl">
                    <div className="flex items-center justify-between bg-[var(--primary)] px-5 py-4 text-white">
                        <div><div className="font-black">پشتیبانی آنلاین توسن</div><div className="mt-1 text-xs text-white/75">گفتگو مستقیم با اپراتور</div></div>
                        <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-white/10" aria-label="بستن"><X size={19} /></button>
                    </div>

                    {!userId ? (
                        <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
                            <MessageCircle size={42} className="text-[var(--primary)]" />
                            <h3 className="mt-4 font-black text-[var(--text)]">برای شروع گفتگو وارد شوید</h3>
                            <p className="mt-2 leading-7 text-sm text-[var(--text-muted)]">برای اینکه سابقه گفتگو و پاسخ اپراتور در حساب شما باقی بماند، ابتدا وارد حساب کاربری شوید.</p>
                            <Link href="/auth?mode=login" className="mt-5 rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white">ورود به حساب</Link>
                        </div>
                    ) : (
                        <>
                            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                                {loading ? <div className="py-10 text-center text-sm text-[var(--text-muted)]">در حال بارگذاری گفتگو...</div> : messages.length === 0 ? <div className="py-10 text-center text-sm leading-7 text-[var(--text-muted)]">سلام 👋<br />پیام خود را بنویسید؛ اپراتور توسن در ساعات پشتیبانی پاسخ می‌دهد.</div> : messages.map((item) => (
                                    <div key={item.id} className={`flex ${item.sender_role === "user" ? "justify-start" : "justify-end"}`}>
                                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-7 ${item.sender_role === "user" ? "bg-[var(--primary)] text-white rounded-bl-md" : "bg-[var(--surface-muted)] text-[var(--text)] rounded-br-md"}`}>
                                            {item.message}
                                            <div className={`mt-1 text-[10px] ${item.sender_role === "user" ? "text-white/60" : "text-[var(--text-muted)]"}`}>{new Date(item.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={sendMessage} className="border-t border-[var(--border)] p-3">
                                <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
                                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پیام شما..." className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text)] outline-none" />
                                    <button type="submit" disabled={!draft.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white disabled:opacity-40" aria-label="ارسال"><Send size={17} /></button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}

            <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3.5 font-black text-white shadow-[0_14px_40px_rgba(9,150,124,0.3)] transition hover:-translate-y-1" aria-label="پشتیبانی آنلاین">
                <MessageCircle size={20} />
                <span className="hidden sm:inline">پشتیبانی آنلاین</span>
            </button>
        </div>
    );
}
