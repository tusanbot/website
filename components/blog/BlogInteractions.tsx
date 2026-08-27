"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Facebook, Link2, MessageCircle, Send, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Comment = { id: string; content: string; author_name: string | null; created_at: string };

type Props = { postId: string; postTitle: string; postUrl: string };

export default function BlogInteractions({ postId, postTitle, postUrl }: Props) {
  const [engagement, setEngagement] = useState({ likes: 0, dislikes: 0, rating_count: 0, rating_average: 0, comment_count: 0 });
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const [{ data: stats }, { data: approved }] = await Promise.all([
      supabase.rpc("blog_post_engagement", { p_post_id: postId }),
      supabase.from("blog_comments").select("id,content,author_name,created_at").eq("post_id", postId).eq("status", "approved").order("created_at", { ascending: false }),
    ]);
    if (stats) setEngagement(stats);
    setComments(approved ?? []);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const [{ data: reaction }, { data: rating }] = await Promise.all([
        supabase.from("blog_reactions").select("reaction").eq("post_id", postId).eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("blog_ratings").select("rating").eq("post_id", postId).eq("user_id", userData.user.id).maybeSingle(),
      ]);
      setMyReaction(reaction?.reaction ?? null);
      setMyRating(rating?.rating ?? null);
    }
  };

  useEffect(() => { void load(); }, [postId]);

  const loginRequired = () => setMessage("برای ثبت نظر، امتیاز یا واکنش ابتدا وارد حساب کاربری شوید.");

  const react = async (reaction: "like" | "dislike") => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return loginRequired();
    setLoading(true); setMessage("");
    if (myReaction === reaction) {
      await supabase.from("blog_reactions").delete().eq("post_id", postId).eq("user_id", userData.user.id);
      setMyReaction(null);
    } else {
      await supabase.from("blog_reactions").upsert({ post_id: postId, user_id: userData.user.id, reaction }, { onConflict: "post_id,user_id" });
      setMyReaction(reaction);
    }
    await load(); setLoading(false);
  };

  const rate = async (value: number) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return loginRequired();
    setLoading(true); setMessage("");
    await supabase.from("blog_ratings").upsert({ post_id: postId, user_id: userData.user.id, rating: value }, { onConflict: "post_id,user_id" });
    setMyRating(value); await load(); setLoading(false);
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (text.length < 2) return setMessage("متن نظر باید حداقل ۲ کاراکتر باشد.");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return loginRequired();
    setLoading(true); setMessage("");
    const name = userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0] || "کاربر";
    const { error } = await supabase.from("blog_comments").insert({ post_id: postId, user_id: userData.user.id, author_name: name, content: text, status: "pending" });
    if (error) setMessage("ثبت نظر انجام نشد. دوباره تلاش کنید.");
    else { setComment(""); setMessage("نظر شما ثبت شد و پس از بررسی منتشر می‌شود."); }
    await load(); setLoading(false);
  };

  const share = async (target: string) => {
    if (target === "copy") { await navigator.clipboard?.writeText(postUrl); setMessage("لینک مقاله کپی شد."); return; }
    if (target === "native" && navigator.share) { await navigator.share({ title: postTitle, url: postUrl }); return; }
    window.open(target, "_blank", "noopener,noreferrer,width=720,height=640");
  };

  const ratingText = useMemo(() => engagement.rating_count ? `${Number(engagement.rating_average).toFixed(1)} از ۵ · ${engagement.rating_count} امتیاز` : "هنوز امتیازی ثبت نشده است", [engagement]);

  return <section className="mt-12 space-y-6" aria-label="تعامل با مقاله">
    <div className="blog-engagement-card">
      <div className="blog-engagement-header"><div><span className="blog-eyebrow">نظر شما مهم است</span><h2>این مقاله چقدر برای شما مفید بود؟</h2><p>{ratingText}</p></div><div className="blog-rating-stars" aria-label="امتیازدهی از یک تا پنج"><span className="blog-rating-average">{engagement.rating_average ? Number(engagement.rating_average).toFixed(1) : "—"}</span>{[1,2,3,4,5].map(v => <button key={v} type="button" disabled={loading} onClick={() => rate(v)} aria-label={`امتیاز ${v} از ۵`} className={v <= (myRating ?? Math.round(Number(engagement.rating_average))) ? "active" : ""}><Star size={22} fill="currentColor" /></button>)}</div></div>
      <div className="blog-reaction-row"><button type="button" disabled={loading} onClick={() => react("like")} className={myReaction === "like" ? "active like" : ""}><ThumbsUp size={19} /> مفید بود <strong>{engagement.likes}</strong></button><button type="button" disabled={loading} onClick={() => react("dislike")} className={myReaction === "dislike" ? "active dislike" : ""}><ThumbsDown size={19} /> مفید نبود <strong>{engagement.dislikes}</strong></button></div>
      {message && <p className="blog-interaction-message" role="status">{message}</p>}
    </div>

    <div className="blog-share-card"><div><span className="blog-eyebrow">اشتراک‌گذاری</span><h2>این مقاله را با دیگران به اشتراک بگذارید</h2></div><div className="blog-share-actions"><button onClick={() => share("native")} className="native-share"><Send size={18} /> اشتراک‌گذاری</button><button onClick={() => share(`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`)} aria-label="اشتراک در تلگرام"><Send size={18} /> تلگرام</button><button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(`${postTitle}\n${postUrl}`)}`)} aria-label="اشتراک در واتساپ"><MessageCircle size={18} /> واتساپ</button><button onClick={() => share("copy")} aria-label="کپی لینک"><Copy size={18} /> کپی لینک</button></div></div>

    <div className="blog-comments-card"><div className="blog-comments-title"><div><span className="blog-eyebrow">گفت‌وگو</span><h2>نظرات کاربران</h2></div><span>{engagement.comment_count} نظر</span></div><div className="blog-comment-form"><textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} placeholder="نظر یا تجربه خود را درباره این مقاله بنویسید..." aria-label="متن نظر" /><div className="blog-comment-form-footer"><small>{comment.length}/۲۰۰۰</small><button type="button" disabled={loading} onClick={submitComment}>ارسال نظر</button></div></div><div className="blog-comments-list">{comments.length ? comments.map(item => <article key={item.id} className="blog-comment"><div className="blog-comment-avatar">{(item.author_name || "ک").slice(0,1)}</div><div><div className="blog-comment-meta"><strong>{item.author_name || "کاربر"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("fa-IR")}</time></div><p>{item.content}</p></div></article>) : <p className="blog-empty-comments">هنوز نظری ثبت نشده است. اولین نفری باشید که نظر می‌دهد.</p>}</div></div>
  </section>;
}
