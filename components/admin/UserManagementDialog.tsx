"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Save, Trash2, KeyRound, UserRound, Tags, ShieldCheck, Check } from "lucide-react";
import { TusanButton, TusanBadge } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type Tag = { id:string; name:string; slug:string; color:string|null; is_active:boolean };
type Props = { userId:string; onClose:()=>void; onSaved:()=>void };

export default function UserManagementDialog({ userId, onClose, onSaved }: Props) {
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [deleting,setDeleting]=useState(false);
  const [error,setError]=useState(""); const [message,setMessage]=useState("");
  const [user,setUser]=useState<any>(null); const [tags,setTags]=useState<Tag[]>([]); const [selectedTags,setSelectedTags]=useState<string[]>([]);
  const [password,setPassword]=useState(""); const [emailConfirm,setEmailConfirm]=useState(false); const [phoneConfirm,setPhoneConfirm]=useState(false);

  useEffect(()=>{ void load(); },[userId]);

  async function authHeaders(){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("نشست مدیریت معتبر نیست.");
    return {Authorization:`Bearer ${session.access_token}`,"Content-Type":"application/json"};
  }
  async function load(){
    setLoading(true); setError(""); setMessage("");
    try{
      const h=await authHeaders(); const r=await fetch(`/api/admin/users/${userId}`,{headers:h,cache:"no-store"}); const j=await r.json();
      if(!r.ok||!j.success) throw new Error(j.error||"خطا در دریافت اطلاعات کاربر.");
      setUser(j.user); setTags(j.tags||[]); setSelectedTags((j.user.assignments||[]).map((x:any)=>x.tag_id));
    }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات کاربر.");}finally{setLoading(false);}
  }

  const assigned = useMemo<Set<string>>(() => new Set<string>((user?.assignments ?? []).map((x:any) => x.tag_id).filter((x: unknown): x is string => typeof x === "string" && x.length > 0)), [user]);
  function toggleTag(id:string){setSelectedTags(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}

  async function save(){
    if(!user) return; setSaving(true); setError(""); setMessage("");
    try{
      const h=await authHeaders();
      const original=Array.from(assigned); const add=selectedTags.filter(x=>!original.includes(x)); const remove=original.filter(x=>!selectedTags.includes(x));
      const r=await fetch(`/api/admin/users/${userId}`,{method:"PATCH",headers:h,body:JSON.stringify({
        email:user.email, email_confirm:emailConfirm,
        phone:user.profile?.phone ?? user.phone ?? "", phone_confirm:phoneConfirm,
        password:password||undefined,
        profile:user.profile,
        add_tag_ids:add, remove_tag_ids:remove
      })});
      const j=await r.json(); if(!r.ok||!j.success) throw new Error(j.error||"ذخیره تغییرات انجام نشد.");
      setPassword(""); setMessage("تغییرات کاربر با موفقیت ذخیره شد."); await load(); onSaved();
    }catch(e){setError(e instanceof Error?e.message:"ذخیره تغییرات انجام نشد.");}finally{setSaving(false);}
  }

  async function removeUser(){
    if(!confirm("حذف این کاربر دائمی است و ممکن است به دلیل سوابق مالی/سفارش‌ها انجام نشود. برای ادامه تأیید کنید.")) return;
    setDeleting(true); setError("");
    try{
      const h=await authHeaders(); const r=await fetch(`/api/admin/users/${userId}`,{method:"DELETE",headers:h,body:JSON.stringify({confirmation:"DELETE"})}); const j=await r.json();
      if(!r.ok||!j.success) throw new Error(j.error||"حذف کاربر انجام نشد.");
      onSaved(); onClose();
    }catch(e){setError(e instanceof Error?e.message:"حذف کاربر انجام نشد.");}finally{setDeleting(false);}
  }

  if(loading) return <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"><div className="bg-[var(--surface)] rounded-2xl p-8">در حال دریافت اطلاعات کاربر...</div></div>;
  if(!user) return <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"><div className="bg-[var(--surface)] rounded-2xl p-8"><div className="text-red-600 mb-4">{error||"کاربر پیدا نشد."}</div><TusanButton onClick={onClose}>بستن</TusanButton></div></div>;

  const field=(label:string,key:string,opts?:{type?:string;placeholder?:string})=><label className="block"><span className="block text-sm font-bold mb-1">{label}</span><input type={opts?.type||"text"} value={user.profile?.[key]??""} onChange={e=>setUser((u:any)=>({...u,profile:{...u.profile,[key]:e.target.value}}))} placeholder={opts?.placeholder} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-[var(--primary)]"/></label>;

  return <div className="fixed inset-0 z-[100] bg-black/50 overflow-y-auto p-4" dir="rtl">
    <div className="max-w-5xl mx-auto my-6 rounded-3xl bg-[var(--surface)] shadow-2xl border border-[var(--border)]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-5 border-b border-[var(--border)] bg-[var(--surface)] rounded-t-3xl">
        <div><h2 className="text-xl font-black">مدیریت کاربر</h2><p className="text-sm text-[var(--text-muted)]">{user.profile?.full_name||user.email||user.id}</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5" aria-label="بستن"><X size={20}/></button>
      </div>
      <div className="p-5 space-y-6">
        {error&&<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
        {message&&<div className="rounded-xl border border-green-200 bg-green-50 text-green-700 p-3 text-sm">{message}</div>}

        <section><div className="flex items-center gap-2 mb-4"><UserRound size={18}/><h3 className="font-black">اطلاعات پروفایل</h3></div>
          <div className="grid md:grid-cols-2 gap-4">
            {field("نام و نام خانوادگی","full_name")}
            {field("کد ملی","national_code")}
            {field("تاریخ تولد","birth_date",{type:"date"})}
            {field("شماره موبایل","phone")}
            {field("نشانی","address")}
            {field("تصویر پروفایل","avatar_url")}
          </div>
        </section>

        <section><div className="flex items-center gap-2 mb-4"><ShieldCheck size={18}/><h3 className="font-black">حساب و احراز هویت</h3></div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block"><span className="block text-sm font-bold mb-1">ایمیل</span><input value={user.email||""} onChange={e=>setUser((u:any)=>({...u,email:e.target.value}))} type="email" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"/></label>
            <label className="block"><span className="block text-sm font-bold mb-1">رمز عبور جدید</span><input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} placeholder="حداقل ۸ کاراکتر" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"/></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emailConfirm} onChange={e=>setEmailConfirm(e.target.checked)}/><span>ایمیل را تأییدشده ثبت کن</span></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={phoneConfirm} onChange={e=>setPhoneConfirm(e.target.checked)}/><span>موبایل را تأییدشده ثبت کن</span></label>
            <div className="text-sm text-[var(--text-muted)]">تأیید فعلی ایمیل: {user.email_confirmed_at?<TusanBadge variant="success">تأیید شده</TusanBadge>:<TusanBadge variant="warning">تأیید نشده</TusanBadge>}</div>
            <div className="text-sm text-[var(--text-muted)]">تأیید فعلی موبایل: {user.phone_confirmed_at?<TusanBadge variant="success">تأیید شده</TusanBadge>:<TusanBadge variant="warning">تأیید نشده</TusanBadge>}</div>
          </div>
        </section>

        <section><div className="flex items-center gap-2 mb-4"><Tags size={18}/><h3 className="font-black">تگ‌های کاربر</h3></div>
          <div className="flex flex-wrap gap-2">{tags.filter(t=>t.is_active).map(tag=><button type="button" key={tag.id} onClick={()=>toggleTag(tag.id)} className={`rounded-full px-3 py-1.5 text-sm font-bold border transition ${selectedTags.includes(tag.id)?"ring-2 ring-[var(--primary)] bg-[var(--primary)]/10":"bg-[var(--surface)]"}`} style={{borderColor:tag.color||"var(--border)"}}>{selectedTags.includes(tag.id)&&<Check size={14} className="inline ml-1"/>}{tag.name}</button>)}</div>
          {!tags.filter(t=>t.is_active).length&&<p className="text-sm text-[var(--text-muted)]">تگ فعالی وجود ندارد.</p>}
        </section>

        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <TusanButton variant="secondary" onClick={save} disabled={saving}>{saving?<span>در حال ذخیره...</span>:<><Save size={16}/> ذخیره تغییرات</>}</TusanButton>
          <TusanButton variant="outline" onClick={removeUser} disabled={deleting}><Trash2 size={16}/> {deleting?"در حال حذف...":"حذف کاربر"}</TusanButton>
        </section>
      </div>
    </div>
  </div>;
}
