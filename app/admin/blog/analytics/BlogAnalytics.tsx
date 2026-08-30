"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Heart, MessageCircle, Star, FileText, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

type Analytics = {
  days:number;
  summary:{total_views:number;today_views:number;week_views:number;published_posts:number;total_likes:number;total_dislikes:number;ratings:number;comments:number};
  daily_views:{date:string;views:number}[];
  top_posts:{id:string;title:string;slug:string;views:number;engagement:number}[];
  categories:{category:string;views:number;posts:number}[];
};

const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month:"short", day:"numeric" });
const nf = new Intl.NumberFormat("fa-IR");

export default function BlogAnalytics(){
 const [days,setDays]=useState(30); const [data,setData]=useState<Analytics|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 async function load(nextDays=days){setLoading(true);setError("");try{const r=await fetch(`/api/admin/blog/analytics?days=${nextDays}`,{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"خطا در دریافت آمار");setData(j); }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت آمار");}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const cards=data?[{label:"بازدید کل",value:data.summary.total_views,icon:Eye},{label:"بازدید امروز",value:data.summary.today_views,icon:TrendingUp},{label:"بازدید ۷ روز",value:data.summary.week_views,icon:Eye},{label:"مقالات منتشرشده",value:data.summary.published_posts,icon:FileText},{label:"لایک",value:data.summary.total_likes,icon:Heart},{label:"امتیازها",value:data.summary.ratings,icon:Star},{label:"نظرات تأییدشده",value:data.summary.comments,icon:MessageCircle}]:[];
 return <main dir="rtl" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm text-[var(--text-muted)]"><Link href="/admin/blog" className="hover:text-[var(--primary)]">مدیریت وبلاگ</Link><span>/</span><span>آمار</span></div><h1 className="text-3xl font-black tracking-tight">تحلیل عملکرد وبلاگ</h1><p className="mt-2 text-sm text-[var(--text-muted)]">تصویری از بازدید، تعامل و محتوای پربازده</p></div><div className="flex rounded-2xl border border-[var(--border)] bg-white p-1 shadow-sm">{[7,30,90].map(d=><button key={d} onClick={()=>{setDays(d);load(d)}} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${days===d?"bg-[var(--primary)] text-white":"text-[var(--text-muted)] hover:bg-black/5"}`}>{nf.format(d)} روز</button>)}</div></div>
  {error&&<div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
  {loading&&!data?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:7}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-white"/>)}</div>:data&&<>
   <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{cards.map(c=>{const I=c.icon;return <div key={c.label} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-[var(--text-muted)]">{c.label}</span><span className="rounded-xl bg-[var(--primary)]/10 p-2 text-[var(--primary)]"><I size={18}/></span></div><div className="text-2xl font-black">{nf.format(c.value)}</div></div>})}</section>
   <section className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-black">روند بازدید</h2><p className="mt-1 text-xs text-[var(--text-muted)]">بازدید روزانه در {nf.format(data.days)} روز اخیر</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.daily_views}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={v=>faDate.format(new Date(v+"T12:00:00"))} tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip labelFormatter={v=>faDate.format(new Date(String(v)+"T12:00:00"))} formatter={(v)=>[nf.format(Number(v)),"بازدید"]}/><Area type="monotone" dataKey="views" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={3}/></AreaChart></ResponsiveContainer></div></div>
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"><h2 className="mb-1 text-lg font-black">عملکرد دسته‌ها</h2><p className="mb-5 text-xs text-[var(--text-muted)]">مقایسه بازدید محتوای منتشرشده</p><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.categories} layout="vertical" margin={{right:8,left:8}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="category" width={90} tick={{fontSize:11}}/><Tooltip formatter={(v)=>[nf.format(Number(v)),"بازدید"]}/><Bar dataKey="views" fill="var(--primary)" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer></div></div>
   </section>
   <section className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">پربازدیدترین مقالات</h2><p className="mt-1 text-xs text-[var(--text-muted)]">بر اساس بازدید ثبت‌شده در بازه انتخابی</p></div><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">{nf.format(data.days)} روز</span></div><div className="divide-y divide-[var(--border)]">{data.top_posts.map((p,i)=><Link href={`/blog/${p.slug}`} target="_blank" key={p.id} className="flex items-center gap-4 py-4 transition hover:bg-black/[.02]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 text-sm font-black">{nf.format(i+1)}</span><div className="min-w-0 flex-1"><div className="truncate font-bold">{p.title}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{nf.format(p.engagement)} تعامل</div></div><div className="flex items-center gap-1 text-sm font-black"><Eye size={16}/>{nf.format(p.views)}</div></Link>)}</div></section>
  </>}
 </main>
}
