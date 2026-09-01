import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STAFF_ROLE_CODES = new Set(["order_manager", "support_operator"]);

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
  source?: "order" | "support";
};

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;

  try {
    const db = supabaseAdmin();
    const [authResult, profilesResult, assignmentsResult, rolesResult, orderReviewsResult, supportReviewsResult] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db.from("profiles").select("id,full_name,phone,role,created_at"),
      db.from("staff_role_assignments").select("id,user_id,role_id,staff_code,status,commission_percent,approved_at,updated_at"),
      db.from("staff_roles").select("id,code,name,description"),
      db.from("staff_reviews").select("id,order_id,customer_id,staff_id,rating,comment,strengths,weaknesses,created_at").order("created_at", { ascending: false }),
      db.from("support_reviews").select("id,conversation_id,customer_id,staff_id,rating,comment,strengths,weaknesses,created_at").order("created_at", { ascending: false }),
    ]);

    if (authResult.error) throw authResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (orderReviewsResult.error) throw orderReviewsResult.error;
    if (supportReviewsResult.error) throw supportReviewsResult.error;

    const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
    const emailMap = new Map((authResult.data?.users ?? []).map((u) => [u.id, u.email ?? null]));
    const roleMap = new Map((rolesResult.data ?? []).map((r) => [r.id, r]));

    const approved = (assignmentsResult.data ?? []).filter((assignment) => {
      if (assignment.status !== "approved") return false;
      const role = roleMap.get(assignment.role_id);
      const code = assignment.staff_code ?? role?.code ?? null;
      return code ? STAFF_ROLE_CODES.has(code) : false;
    });

    const staffIds = new Set(approved.map((assignment) => assignment.user_id));
    const byStaff = new Map<string, any[]>();

    for (const assignment of approved) {
      const role = roleMap.get(assignment.role_id);
      const code = assignment.staff_code ?? role?.code ?? "unknown";
      const list = byStaff.get(assignment.user_id) ?? [];
      list.push({
        id: assignment.id,
        code,
        name: role?.name ?? (code === "order_manager" ? "مدیر سفارشات" : "اپراتور پشتیبانی"),
        status: assignment.status,
        commission_percent: code === "order_manager" ? assignment.commission_percent : null,
        approved_at: assignment.approved_at,
        description: role?.description ?? null,
      });
      byStaff.set(assignment.user_id, list);
    }

    const staff = [...staffIds]
      .map((id) => {
        const roles = byStaff.get(id) ?? [];
        const orderReviews: Review[] = (orderReviewsResult.data ?? [])
          .filter((review) => review.staff_id === id)
          .map((review) => ({ ...review, source: "order" }));
        const supportReviews: Review[] = (supportReviewsResult.data ?? [])
          .filter((review) => review.staff_id === id)
          .map((review) => ({ ...review, source: "support" }));
        const reviews = [...orderReviews, ...supportReviews].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const average = reviews.length
          ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
          : null;
        const profile = profileMap.get(id);
        return {
          id,
          email: emailMap.get(id) ?? null,
          full_name: profile?.full_name ?? null,
          phone: profile?.phone ?? null,
          roles,
          average_rating: average,
          review_count: reviews.length,
          reviews,
        };
      })
      .sort((a, b) => {
        if (a.average_rating == null && b.average_rating == null) return (a.full_name ?? "").localeCompare(b.full_name ?? "");
        if (a.average_rating == null) return 1;
        if (b.average_rating == null) return -1;
        if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
        return b.review_count - a.review_count;
      });

    return NextResponse.json({ success: true, staff: staff.map((member, index) => ({ ...member, rank: index + 1 })) });
  } catch (error) {
    console.error("[admin/staff] failed", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت فهرست مدیران و اپراتورها." }, { status: 500 });
  }
}
