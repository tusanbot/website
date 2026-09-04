"use client";
import { useState } from "react";
import Link from "next/link";

type Service={id:string;name:string;description:string|null;customer_unit_price:number|null};
export default function SocialServicesInteractive({services}:{services:Service[]}){
 const[selected,setSelected]=useState<Service|null>(null);
 return <>
  <div className="relative w-full overflow-x-auto rounded-3xl border border-[var(--primary)]/20 bg-[var(--primary)] py-3.5 shadow-sm">
   <div className="flex w-max min-w-full justify-center gap-3 px-4 sm:gap-5 sm:px-5">{services.map(s=><button key={s.id} type="button" onClick={()=>setSelected(v=>v?.id===s.id?null:s)} className="shrink-0 rounded-full border border-white/70 bg-white px-5 py-3 text-sm font-black whitespace-nowrap text-slate-900 shadow-sm transition hover:bg-white/90">{s.name}{s.customer_unit_price!=null&&<span className="mr-2 text-[var(--primary)]">{Number(s.customer_unit_price).toLocaleString("fa-IR")} تومان</span>}</button>)}</div>
  </div>
  {selected&&<div className="relative z-40 mx-auto mt-3 w-full max-w-2xl"><div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--surface)] p-4 text-right shadow-xl"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{selected.name}</h3>{selected.customer_unit_price!=null&&<span className="mt-1 block text-sm font-bold text-[var(--primary)]">{Number(selected.customer_unit_price).toLocaleString("fa-IR")} تومان</span>}</div><button type="button" onClick={()=>setSelected(null)} className="rounded-lg px-2 py-1 text-lg" aria-label="بستن">×</button></div><p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description||"توضیحات این خدمت در دسترس است."}</p><Link href={`/social?service=${encodeURIComponent(selected.id)}`} className="mt-3 block rounded-xl bg-[var(--primary)] px-4 py-2 text-center text-sm font-black text-white">مشاهده و ثبت سفارش</Link></div></div>}
 </>;
}
