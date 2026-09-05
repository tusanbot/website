"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, MessageCircle, Send, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; content: string; author_name: string | null; created_at: string; status?: string };
type Props = { postId: string; postTitle: string; postUrl: string };

type Engagement = { likes: number; dislikes: number; rating_count: number; rating_average: number; comment_count: number; view_count: number };

export default function BlogInteractions({ postId, postTitle, postUrl }: Props) {
  const [engagement, setEngagement] = useState<Engagement>({ likes: 0, dislikes: 0, rating_count: 0, rating_average: 0, comment_count: 0, view_count: 0 });
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    const [statsResult, commentsResult] = await Promise.all([
      supabase.rpc("blog_post_engagement", { p_post_id: postId }),
      userId
        ? supabase.from("blog_comments").select("id,content,author_name,created_at,status").eq("post_id", postId).or(`status.eq.approved,user_id.eq.${userId}`).order("created_at", { ascending: false })
        : supabase.from("blog_comments").select("id,content,author_name,created_at,status").eq("post_id", postId).eq("status", "approved").order("created_at", { ascending: false }),
    ]);

    if (!statsResult.error && statsResult.data) {
      const stats = statsResult.data as Partial<Engagement>;
      setEngagement({
        likes: Number(stats.likes ?? 0), dislikes: Number(stats.dislikes ?? 0), rating_count: Number(stats.rating_count ?? 0),
        rating_average: Number(stats.rating_average ?? 0), comment_count: Number(stats.comment_count ?? 0), view_count: Number(stats.view_count ?? 0),
      });
    }
    if (!commentsResult.error) setComments(commentsResult.data ?? []);

    if (userId) {
      const [{ data: reaction }, { data: rating }] = await Promise.all([
        supabase.from("blog_reactions").select("reaction").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
        supabase.from("blog_ratings").select("rating").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
      ]);
      setMyReaction(reaction?.reaction ?? null);
      setMyRating(rating?.rating ?? null);
    } else {
      setMyReaction(null);
      setMyRating(null);
    }
  };

  useEffect(() => { void load(); }, [postId]);
  const loginRequired = () => setMessage("برای ثبت نظر، امتیاز یا واکنش ابتدا وارد حساب کاربری شوید.");

  const react = async (reaction: "like" | "dislike") => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return loginRequired();
    setLoading(true); setMessage("");
    const result = myReaction === reaction
      ? await supabase.from("blog_reactions").delete().eq("post_id", postId).eq("user_id", userId)
      : await supabase.from("blog_reactions").upsert({ post_id: postId, user_id: userId, reaction }, { onConflict: "post_id,user_id" });
    if (result.error) setMessage("ثبت واکنش انجام نشد. لطفاً دوباره تلاش کنید.");
    else setMyReaction(myReaction === reaction ? null : reaction);
    await load(); setLoading(false);
  };

  const rate = async (value: number) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return loginRequired();
    setLoading(true); setMessage("");
    const result = await supabase.from("blog_ratings").upsert({ post_id: postId, user_id: userId, rating: value }, { onConflict: "post_id,user_id" });
    if (result.error) setMessage("ثبت امتیاز انجام نشد. لطفاً دوباره تلاش کنید.");
    else setMyRating(value);
    await load(); setLoading(false);
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (text.length < 2) return setMessage("متن نظر باید حداقل ۲ کاراکتر باشد.");
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return loginRequired();
    setLoading(true); setMessage("");
    const name = userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "کاربر";
    const { error } = await supabase.from("blog_comments").insert({ post_id: postId, user_id: userId, author_name: name, content: text, status: "pending" });
    if (error) setMessage("ثبت نظر انجام نشد. لطفاً دوباره تلاش کنید.");
    else { setComment(""); setMessage("نظر شما ثبت شد و تا زمان تأیید، با برچسب «در انتظار تأیید» نمایش داده می‌شود."); }
    await load(); setLoading(false);
  };

  const share = async (target: string) => {
    try {
      if (target === "copy") { await navigator.clipboard?.writeText(postUrl); setMessage("لینک مقاله کپی شد."); return; }
      if (target === "native" && navigator.share) { await navigator.share({ title: postTitle, url: postUrl }); return; }
      if (target === "native") { await navigator.clipboard?.writeText(postUrl); setMessage("لینک مقاله کپی شد."); return; }
      window.open(target, "_blank", "noopener,noreferrer,width=720,height=640");
    } catch { setMessage("اشتراک‌گذاری لغو شد یا در این مرورگر در دسترس نیست."); }
  };

  const ratingText = useMemo(() => engagement.rating_count ? `${Number(engagement.rating_average).toFixed(1)} از ۵ · ${engagement.rating_count} امتیاز` : "هنوز امتیازی ثبت نشده است", [engagement]);

  return <section className="mt-14 space-y-6" aria-label="تعامل با مقاله">
    <div className="rounded-3xl border border-[color-mix(in_srgb,var(--primary)_14%,transparent)] bg-gradient-to-br from-[var(--surface-strong)] to-[var(--primary-light)]/70 p-6 shadow-[var(--shadow-md)] md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><span className="inline-flex rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-extrabold text-[var(--primary-dark)]">نظر شما مهم است</span><h2 className="mt-3 text-2xl font-black text-[var(--text)]">این مقاله چقدر برای شما مفید بود؟</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{ratingText}</p></div><div className="flex items-center gap-1 rounded-2xl bg-white/85 p-3 shadow-sm"><span className="ml-2 text-xl font-black text-[var(--primary-dark)]">{engagement.rating_average ? Number(engagement.rating_average).toFixed(1) : "—"}</span>{[1,2,3,4,5].map(v => <button key={v} type="button" disabled={loading} onClick={() => rate(v)} aria-label={`امتیاز ${v} از ۵`} className={`rounded-lg p-1 transition hover:scale-110 ${v <= (myRating ?? Math.round(Number(engagement.rating_average))) ? "text-amber-400" : "text-slate-300"}`}><Star size={22} fill="currentColor" /></button>)}</div></div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={loading} onClick={() => react("like")} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${myReaction === "like" ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary-dark)]" : "border-[var(--border)] bg-white text-[var(--text-secondary)]"}`}><ThumbsUp size={19} /> مفید بود <strong>{engagement.likes}</strong></button><button type="button" disabled={loading} onClick={() => react("dislike")} className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${myReaction === "dislike" ? "border-red-200 bg-red-50 text-red-600" : "border-[var(--border)] bg-white text-[var(--text-secondary)]"}`}><ThumbsDown size={19} /> مفید نبود <strong>{engagement.dislikes}</strong></button><span className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-secondary)]"><Eye size={18} /> {engagement.view_count.toLocaleString("fa-IR")} بازدید</span></div>
      {message && <p className="mt-4 rounded-xl bg-white/75 px-4 py-3 text-sm font-medium text-[var(--text-secondary)]" role="status">{message}</p>}
    </div>

    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-sm)] md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="inline-flex rounded-full bg-[var(--secondary-light)] px-3 py-1 text-xs font-extrabold text-[var(--secondary-dark)]">اشتراک‌گذاری</span><h2 className="mt-3 text-xl font-black text-[var(--text)]">این مقاله را با دیگران به اشتراک بگذارید</h2></div><div className="flex flex-wrap gap-2"><button onClick={() => share("native")} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-dark)]"><Send size={17} /> اشتراک‌گذاری</button><button onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)]"><Send size={17} /> تلگرام</button><button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(`${postTitle}\n${postUrl}`)}`)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)]"><MessageCircle size={17} /> واتساپ</button><button onClick={() => share("copy")} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)]"><Copy size={17} /> کپی لینک</button></div></div></div>

    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-sm)] md:p-8"><div className="flex items-center justify-between gap-4"><div><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-[var(--text-secondary)]">گفت‌وگو</span><h2 className="mt-3 text-xl font-black text-[var(--text)]">نظرات کاربران</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-[var(--text-secondary)]">{engagement.comment_count} نظر</span></div><div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"><textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} placeholder="نظر یا تجربه خود را درباره این مقاله بنویسید..." aria-label="متن نظر" className="min-h-28 w-full resize-y border-0 bg-transparent text-sm leading-7 text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]" /><div className="mt-3 flex items-center justify-between gap-3"><small className="text-[var(--text-muted)]">{comment.length}/۲۰۰۰</small><button type="button" disabled={loading} onClick={submitComment} className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-dark)]">ارسال نظر</button></div></div><div className="mt-6 space-y-4">{comments.length ? comments.map(item => <article key={item.id} className="flex gap-3 rounded-2xl border border-[var(--border)] p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] font-black text-[var(--primary-dark)]">{(item.author_name || "ک").slice(0,1)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><strong className="text-sm text-[var(--text)]">{item.author_name || "کاربر"}</strong>{item.status === "pending" && <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">در انتظار تأیید</span>}<time className="text-xs text-[var(--text-muted)]" dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("fa-IR")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{item.content}</p></div></article>) : <p className="rounded-2xl bg-[var(--surface-muted)] p-5 text-center text-sm text-[var(--text-secondary)]">هنوز نظری ثبت نشده است. اولین نفری باشید که نظر می‌دهد.</p>}</div></div>
  </section>;
}
