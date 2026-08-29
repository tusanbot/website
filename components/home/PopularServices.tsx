"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/ui";

type Service={id:string;title:string;slug:string|null;category:string|null;description:string|null;price:number;is_popular?:boolean};
export default function PopularServices(){
 const [services,setServices]=useState<Service[]>([]); const [selected,setSelected]=useState<string|null>(null); const railRef=useRef<HTMLDivElement>(null); const x=useMotionValue(0); const paused=!!selected;
 useEffect(()=>{supabase.from("services").select("id,title,slug,category,description,price,is_popular").eq("is_active",true).order("is_popular",{ascending:false}).order("created_at",{ascending:false}).limit(10).then(({data})=>setServices((data||[]) as Service[]))},[]);
 useAnimationFrame((_,delta)=>{if(paused||!services.length)return; const width=railRef.current?.scrollWidth||0; if(width>0){const next=x.get()-delta*0.035; x.set(next<-(width/2)?0:next)}});
 function activate(id:string){setSelected(v=>v===id?null:id)}
 return <section id="popular-services" className="relative scroll-mt-28 py-7 sm:py-9" dir="rtl" onClick={e=>{if(e.target===e.currentTarget||!(e.target as HTMLElement).closest("[data-service-tag]"))setSelected(null)}}>
  <div className="mx-auto max-w-7xl px-4 lg:px-8"><SectionHeader title="خدمات محبوب توسن" description="روی هر خدمت بزنید تا توضیحات آن را ببینید." align="center"/>
   <div className="relative mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/70 py-3 shadow-sm" onClick={e=>e.stopPropagation()}>
    <motion.div ref={railRef} style={{x}} className="flex w-max gap-3 px-3" dir="rtl">{[...services,...services].map((s,i)=>{const active=selected===s.id;const href=s.slug?`/services/${encodeURIComponent(s.slug)}`:`/services?category=${encodeURIComponent(s.category||"all")}`;return <div key={`${s.id}-${i}`} data-service-tag className="relative shrink-0"><button type="button" onClick={()=>activate(s.id)} className={`rounded-full border px-5 py-2.5 text-sm font-black whitespace-nowrap transition ${active?"border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg":"border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text)] hover:border-[var(--primary)]/40"}`}><span>{s.title}</span>{s.price>0&&<span className={`mr-2 ${active?"text-white/85":"text-[var(--primary)]"}`}>{s.price.toLocaleString("fa-IR")} تومان</span>}</button>{active&&<motion.div initial={{opacity:0,y:-6,height:0}} animate={{opacity:1,y:0,height:"auto"}} className="absolute right-0 top-full z-30 mt-2 w-[min(330px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[var(--primary)]/20 bg-[var(--surface)] p-4 text-right shadow-2xl"><p className="text-sm leading-7 text-[var(--text-muted)]">{s.description||"توضیحات این خدمت در دسترس است."}</p><Link href={href} className="mt-3 block rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-sm font-black text-white">مشاهده و ثبت سفارش</Link></motion.div>}</div>})}</motion.div>
   </div>
  </div></section>;
}