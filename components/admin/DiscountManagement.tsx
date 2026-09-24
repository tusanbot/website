"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader, TusanBadge, TusanButton, TusanInput, TusanTable } from "@/components/ui";

type Tag={id:string;name:string;slug:string;description:string|null;color:string;is_active:boolean};
type Discount={id:string;name:string;description:string|null;discount_type:"percent"|"fixed";value:number;max_discount_amount:number|null;min_order_amount:number|null;starts_at:string|null;ends_at:string|null;usage_limit:number|null;per_user_limit:number|null;is_active:boolean;stackable:boolean;priority:number};
type User={id:string;full_name:string|null;email:string|null};
type LinkRow={id:string;tag_id:string;code:string;is_active:boolean;expires_at:string|null};
type Service={id:string;title:string;is_active:boolean};

const emptyDiscount={name:"",description:"",discount_type:"percent" as const,value:"",max_discount_amount:"",min_order_amount:"",starts_at:"",ends_at:"",usage_limit:"",per_user_limit:"",priority:"0",stackable:false,is_active:true};

export default function DiscountManagement(){
 const [tags,setTags]=useState<Tag[]>([]); const [discounts,setDiscounts]=useState<Discount[]>([]); const [links,setLinks]=useState<LinkRow[]>([]); const [users,setUsers]=useState<User[]>([]); const [services,setServices]=useState<Service[]>([]);
 const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [tagForm,setTagForm]=useState({name:"",slug:"",description:"",color:"#179d99"}); const [discountForm,setDiscountForm]=useState(emptyDiscount); const [codeForm,setCodeForm]=useState({discount_id:"",code:"",usage_limit:"",per_user_limit:"",starts_at:"",ends_at:""}); const [linkForm,setLinkForm]=useState({tag_id:"",code:"",expires_at:""}); const [assignForm,setAssignForm]=useState({userId:"",tagId:"",expires_at:""}); const [bindingForm,setBindingForm]=useState({discountId:"",tagId:"",serviceId:""});
 async function load(){
  setLoading(true);setError("");
  try{
   const [t,d,l,u]=await Promise.all([
    supabase.from("member_tags").select("*").order("created_at",{ascending:false}),
    supabase.from("discounts").select("*").order("priority",{ascending:false}).order("created_at",{ascending:false}),
    supabase.from("tag_referral_links").select("*").order("created_at",{ascending:false}),
    fetch("/api/admin/users",{cache:"no-store"}).then(r=>r.json()),
    supabase.from("services").select("id,title,is_active").eq("is_active",true).order("title")
   ]);
   if(t.error)throw t.error;if(d.error)throw d.error;if(l.error)throw l.error;
   setTags((t.data||[]) as Tag[]);setDiscounts((d.data||[]) as Discount[]);setLinks((l.data||[]) as LinkRow[]);setUsers((u.users||[]) as User[]);if((services as any)?.error)throw (services as any).error;setServices(((services as any)?.data||[]) as Service[]);
   if(!codeForm.discount_id && d.data?.[0])setCodeForm(v=>({...v,discount_id:d.data[0].id}));
   if(!linkForm.tag_id && t.data?.[0])setLinkForm(v=>({...v,tag_id:t.data[0].id}));
   if(!assignForm.tagId && t.data?.[0])setAssignForm(v=>({...v,tagId:t.data[0].id}));
   if(!bindingForm.discountId && d.data?.[0])setBindingForm(v=>({...v,discountId:d.data[0].id}));
   if(!bindingForm.tagId && t.data?.[0])setBindingForm(v=>({...v,tagId:t.data[0].id}));
   if(!bindingForm.serviceId && services?.data?.[0])setBindingForm(v=>({...v,serviceId:services.data[0].id}));
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات.");}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function addTag(){
  if(!tagForm.name.trim()||!tagForm.slug.trim())return setError("نام و slug تگ الزامی است.");
  const {error}=await supabase.from("member_tags").insert({name:tagForm.name.trim(),slug:tagForm.slug.trim().toLowerCase(),description:tagForm.description.trim()||null,color:tagForm.color});
  if(error)return setError(error.message);setTagForm({name:"",slug:"",description:"",color:"#179d99"});await load();
 }
 async function addDiscount(){
  if(!discountForm.name.trim()||!discountForm.value)return setError("نام و مقدار تخفیف الزامی است.");
  const {error}=await supabase.from("discounts").insert({name:discountForm.name.trim(),description:discountForm.description.trim()||null,discount_type:discountForm.discount_type,value:Number(discountForm.value),max_discount_amount:discountForm.max_discount_amount?Number(discountForm.max_discount_amount):null,min_order_amount:discountForm.min_order_amount?Number(discountForm.min_order_amount):null,starts_at:discountForm.starts_at||null,ends_at:discountForm.ends_at||null,usage_limit:discountForm.usage_limit?Number(discountForm.usage_limit):null,per_user_limit:discountForm.per_user_limit?Number(discountForm.per_user_limit):null,priority:Number(discountForm.priority||0),stackable:discountForm.stackable,is_active:discountForm.is_active});
  if(error)return setError(error.message);setDiscountForm(emptyDiscount);await load();
 }
 async function addCode(){
  if(!codeForm.discount_id||!codeForm.code.trim())return setError("تخفیف و کد الزامی است.");
  const {error}=await supabase.from("discount_codes").insert({discount_id:codeForm.discount_id,code:codeForm.code.trim().toUpperCase(),usage_limit:codeForm.usage_limit?Number(codeForm.usage_limit):null,per_user_limit:codeForm.per_user_limit?Number(codeForm.per_user_limit):null,starts_at:codeForm.starts_at||null,ends_at:codeForm.ends_at||null});
  if(error)return setError(error.message);setCodeForm(v=>({...v,code:"",usage_limit:"",per_user_limit:"",starts_at:"",ends_at:""}));await load();
 }
 async function addLink(){
  if(!linkForm.tag_id||!linkForm.code.trim())return setError("تگ و کد لینک الزامی است.");
  const {error}=await supabase.from("tag_referral_links").insert({tag_id:linkForm.tag_id,code:linkForm.code.trim().toUpperCase(),expires_at:linkForm.expires_at||null});
  if(error)return setError(error.message);setLinkForm(v=>({...v,code:"",expires_at:""}));await load();
 }
 async function bindDiscount(){
  if(!bindingForm.discountId)return setError("تخفیف را انتخاب کنید.");
  if(bindingForm.tagId){const {error}=await supabase.from("discount_tag_rules").upsert({discount_id:bindingForm.discountId,tag_id:bindingForm.tagId},{onConflict:"discount_id,tag_id"});if(error)return setError(error.message);}
  if(bindingForm.serviceId){
   const {error}=await supabase.from("discount_services").upsert({discount_id:bindingForm.discountId,service_id:bindingForm.serviceId},{onConflict:"discount_id,service_id"});
   if(error)return setError(error.message);
   const {error:updateError}=await supabase.from("discounts").update({applies_to_all_services:false}).eq("id",bindingForm.discountId);
   if(updateError)return setError(updateError.message);
  }
  await load();
 }
 async function assignTag(){
  if(!assignForm.userId||!assignForm.tagId)return setError("کاربر و تگ را انتخاب کنید.");
  const {error}=await supabase.from("member_tag_assignments").upsert({user_id:assignForm.userId,tag_id:assignForm.tagId,source:"manual",expires_at:assignForm.expires_at||null},{onConflict:"tag_id,user_id"});
  if(error)return setError(error.message);setAssignForm(v=>({...v,expires_at:""}));await load();
 }
 const tagName=useMemo(()=>Object.fromEntries(tags.map(t=>[t.id,t.name])),[tags]);
 if(loading)return <GlassPanel className="p-10 text-center">در حال دریافت مدیریت تخفیف...</GlassPanel>;
 return <div dir="rtl" className="space-y-6">
  <SectionHeader title="تخفیف‌ها و تگ اعضا" description="مدیریت تگ‌ها، کمپین‌های تخفیف، کدها و لینک‌های اختصاصی اعضا"/>
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
  <GlassPanel className="p-5 space-y-4">
   <h2 className="font-black text-lg">تگ اعضا</h2>
   <div className="grid md:grid-cols-4 gap-3"><TusanInput placeholder="نام تگ" value={tagForm.name} onChange={e=>setTagForm(v=>({...v,name:e.target.value}))}/><TusanInput placeholder="slug انگلیسی" value={tagForm.slug} onChange={e=>setTagForm(v=>({...v,slug:e.target.value}))}/><TusanInput placeholder="توضیح" value={tagForm.description} onChange={e=>setTagForm(v=>({...v,description:e.target.value}))}/><TusanButton onClick={addTag}>افزودن تگ</TusanButton></div>
   <div className="flex flex-wrap gap-2">{tags.map(t=><TusanBadge key={t.id} variant={t.is_active?"info":"danger"}>{t.name} · {t.slug}</TusanBadge>)}</div>
  </GlassPanel>
  <GlassPanel className="p-5 space-y-4">
   <h2 className="font-black text-lg">تخفیف جدید</h2>
   <div className="grid md:grid-cols-4 gap-3">
    <TusanInput placeholder="نام تخفیف" value={discountForm.name} onChange={e=>setDiscountForm(v=>({...v,name:e.target.value}))}/>
    <select value={discountForm.discount_type} onChange={e=>setDiscountForm(v=>({...v,discount_type:e.target.value as "percent"|"fixed"}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white"><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select>
    <TusanInput placeholder="مقدار" type="number" value={discountForm.value} onChange={e=>setDiscountForm(v=>({...v,value:e.target.value}))}/>
    <TusanInput placeholder="حداکثر تخفیف" type="number" value={discountForm.max_discount_amount} onChange={e=>setDiscountForm(v=>({...v,max_discount_amount:e.target.value}))}/>
    <TusanInput placeholder="حداقل سفارش" type="number" value={discountForm.min_order_amount} onChange={e=>setDiscountForm(v=>({...v,min_order_amount:e.target.value}))}/>
    <TusanInput placeholder="شروع ISO" value={discountForm.starts_at} onChange={e=>setDiscountForm(v=>({...v,starts_at:e.target.value}))}/>
    <TusanInput placeholder="پایان ISO" value={discountForm.ends_at} onChange={e=>setDiscountForm(v=>({...v,ends_at:e.target.value}))}/>
    <TusanInput placeholder="سقف کل مصرف" type="number" value={discountForm.usage_limit} onChange={e=>setDiscountForm(v=>({...v,usage_limit:e.target.value}))}/>
    <TusanInput placeholder="سقف هر کاربر" type="number" value={discountForm.per_user_limit} onChange={e=>setDiscountForm(v=>({...v,per_user_limit:e.target.value}))}/>
    <TusanInput placeholder="اولویت" type="number" value={discountForm.priority} onChange={e=>setDiscountForm(v=>({...v,priority:e.target.value}))}/>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={discountForm.stackable} onChange={e=>setDiscountForm(v=>({...v,stackable:e.target.checked}))}/>قابل ترکیب</label>
    <TusanButton onClick={addDiscount}>ثبت تخفیف</TusanButton>
   </div>
   <TusanTable columns={[{key:"name",title:"نام"},{key:"type",title:"نوع"},{key:"value",title:"مقدار"},{key:"limits",title:"محدودیت"},{key:"status",title:"وضعیت"}]} rows={discounts.map(d=>({name:d.name,type:d.discount_type==="percent"?"درصدی":"ثابت",value:d.discount_type==="percent"?Number(d.value).toLocaleString("fa-IR")+"٪":Number(d.value).toLocaleString("fa-IR")+" تومان",limits:<span>{d.usage_limit??"∞"} / {d.per_user_limit??"∞"}</span>,status:<TusanBadge variant={d.is_active?"success":"danger"}>{d.is_active?"فعال":"غیرفعال"}</TusanBadge>}))}/>
  </GlassPanel>
  <GlassPanel className="p-5 space-y-4">
   <h2 className="font-black text-lg">کد تخفیف</h2>
   <div className="grid md:grid-cols-3 gap-3"><select value={codeForm.discount_id} onChange={e=>setCodeForm(v=>({...v,discount_id:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white">{discounts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><TusanInput placeholder="کد، مثلاً TOSAN10" value={codeForm.code} onChange={e=>setCodeForm(v=>({...v,code:e.target.value}))}/><TusanButton onClick={addCode}>افزودن کد</TusanButton></div>
  </GlassPanel>
  <GlassPanel className="p-5 space-y-4">
   <h2 className="font-black text-lg">لینک اختصاصی و اختصاص تگ</h2>
   <div className="grid md:grid-cols-4 gap-3"><select value={linkForm.tag_id} onChange={e=>setLinkForm(v=>({...v,tag_id:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white">{tags.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><TusanInput placeholder="کد لینک، مثلاً TRACTOR" value={linkForm.code} onChange={e=>setLinkForm(v=>({...v,code:e.target.value}))}/><TusanInput placeholder="تاریخ انقضا ISO" value={linkForm.expires_at} onChange={e=>setLinkForm(v=>({...v,expires_at:e.target.value}))}/><TusanButton onClick={addLink}>ساخت لینک</TusanButton></div>
   <div className="text-sm text-[var(--text-muted)]">لینک خروجی: <span dir="ltr">/join/CODE</span></div>
   <TusanTable columns={[{key:"code",title:"کد"},{key:"tag",title:"تگ"},{key:"status",title:"وضعیت"}]} rows={links.map(l=>({code:<span dir="ltr" className="font-bold">{l.code}</span>,tag:tagName[l.tag_id]||"—",status:<TusanBadge variant={l.is_active?"success":"danger"}>{l.is_active?"فعال":"غیرفعال"}</TusanBadge>}))}/>
   <div className="border-t pt-4 space-y-3">
    <div className="grid md:grid-cols-4 gap-3"><select value={bindingForm.discountId} onChange={e=>setBindingForm(v=>({...v,discountId:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white">{discounts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select value={bindingForm.tagId} onChange={e=>setBindingForm(v=>({...v,tagId:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white"><option value="">بدون تگ (عمومی)</option>{tags.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select value={bindingForm.serviceId} onChange={e=>setBindingForm(v=>({...v,serviceId:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white"><option value="">همه خدمات</option>{services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><TusanButton onClick={bindDiscount}>اتصال تخفیف</TusanButton></div>
    <div className="grid md:grid-cols-3 gap-3"><select value={assignForm.userId} onChange={e=>setAssignForm(v=>({...v,userId:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white"><option value="">انتخاب کاربر</option>{users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email||u.id.slice(0,8)}</option>)}</select><select value={assignForm.tagId} onChange={e=>setAssignForm(v=>({...v,tagId:e.target.value}))} className="rounded-xl border border-[var(--border)] px-3 py-2 bg-white">{tags.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><TusanButton onClick={assignTag}>اختصاص تگ به کاربر</TusanButton></div>
  </GlassPanel>
 </div>;
}
