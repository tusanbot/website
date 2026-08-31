import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  try {
    const db = supabaseAdmin();
    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }, { data: assignments, error: assignmentsError }, { data: reviews, error: reviewsError }] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db.from("profiles").select("id,full_name,phone,role,created_at"),
      db.from("staff_role_assignments").select("id,user_id,role_id,staff_code,status,commission_percent,approved_at,updated_at,staff_roles(code,name,description)"),
      db.from("support_reviews").select("id,conversation_id,customer_id,staff_id,rating,comment,strengths,weaknesses,created_at"),
    ]);
    if (authError) throw authError;
    if (profilesError) throw profilesError;
    if (assignmentsError) throw assignmentsError;
    if (reviewsError) throw reviewsError;
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
    const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email ?? null]));
    const staffIds = new Set((assignments ?? []).filter(a => a.status === "approved" && ["order_manager", "support_operator"].includes(a.staff_code ?? "")).map(a => a.user_id));
    const byStaff = new Map<string, any[]>();
    for (const a of assignments ?? []) { if (!staffIds.has(a.user_id)) continue; const role = Array.isArray(a.staff_roles) ? a.staff_roles[0] : a.staff_roles; const list = byStaff.get(a.user_id) ?? []; list.push({ id:a.id, code:a.staff_code ?? role?.code ?? "unknown", name:role?.name ?? a.staff_code ?? "مقام نامشخص", status:a.status, commission_percent:a.commission_percent, approved_at:a.approved_at, description:role?.description ?? null }); byStaff.set(a.user_id,list); }
    const staff = [...staffIds].map(id => { const rs=byStaff.get(id) ?? []; const rv=(reviews ?? []).filter(r => r.staff_id===id); const avg=rv.length ? rv.reduce((s,r)=>s+Number(r.rating||0),0)/rv.length : null; const p=profileMap.get(id); return { id, email:emailMap.get(id)??null, full_name:p?.full_name??null, phone:p?.phone??null, roles:rs, average_rating:avg, review_count:rv.length, reviews:rv }; }).sort((a,b)=>(b.average_rating??0)-(a.average_rating??0));
    return NextResponse.json({ success:true, staff:staff.map((s,i)=>({...s,rank:i+1})) });
  } catch (error) { console.error("[admin/staff] failed",error); return NextResponse.json({success:false,error:"خطا در دریافت فهرست مدیران و اپراتورها."},{status:500}); }
}
