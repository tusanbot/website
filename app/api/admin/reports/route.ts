import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function dateOnly(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;

  const url = new URL(request.url);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const from = dateOnly(url.searchParams.get("from"), defaultFrom);
  const to = dateOnly(url.searchParams.get("to"), now);
  to.setUTCHours(23, 59, 59, 999);
  const status = url.searchParams.get("status") || "all";
  const serviceId = url.searchParams.get("service") || "all";

  try {
    const db = supabaseAdmin();

    let ordersQuery = db
      .from("orders")
      .select("id,user_id,service_id,status,price,created_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (status !== "all") ordersQuery = ordersQuery.eq("status", status);
    if (serviceId !== "all") ordersQuery = ordersQuery.eq("service_id", serviceId);

    const [{ data: orders, error: ordersError }, { data: services, error: servicesError }] = await Promise.all([
      ordersQuery,
      db.from("services").select("id,title,category,is_active").order("title"),
    ]);

    if (ordersError) throw ordersError;
    if (servicesError) throw servicesError;

    const rows = orders || [];
    const serviceMap = new Map((services || []).map((service) => [service.id, service]));

    const statusCounts: Record<string, number> = {};
    const serviceStats: Record<string, { title: string; count: number; revenue: number }> = {};
    const daily: Record<string, { orders: number; revenue: number }> = {};
    const userIds = new Set<string>();

    for (const order of rows) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      if (order.user_id) userIds.add(order.user_id);

      const revenue = Number(order.price || 0);
      const service = serviceMap.get(order.service_id);
      if (order.service_id) {
        const current = serviceStats[order.service_id] || {
          title: service?.title || "خدمت حذف‌شده",
          count: 0,
          revenue: 0,
        };
        current.count += 1;
        current.revenue += revenue;
        serviceStats[order.service_id] = current;
      }

      const day = String(order.created_at).slice(0, 10);
      daily[day] = daily[day] || { orders: 0, revenue: 0 };
      daily[day].orders += 1;
      daily[day].revenue += revenue;
    }

    const [profilesResult, authResult] = await Promise.all([
      db.from("profiles").select("id,created_at,full_name"),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (authResult.error) throw authResult.error;

    const authUsers = authResult.data.users || [];
    const periodStart = from.getTime();
    const periodEnd = to.getTime();
    const newUsers = authUsers.filter((user) => {
      const created = new Date(user.created_at).getTime();
      return created >= periodStart && created <= periodEnd;
    }).length;
    const profileIds = new Set((profilesResult.data || []).map((profile) => profile.id));
    const incompleteUsers = authUsers.filter((user) => !profileIds.has(user.id)).length;

    const revenue = rows.reduce((sum, order) => sum + Number(order.price || 0), 0);
    const completed = rows.filter((order) => order.status === "completed").length;
    const cancelled = rows.filter((order) => order.status === "cancelled").length;

    return NextResponse.json({
      success: true,
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        orders: rows.length,
        revenue,
        averageOrder: rows.length ? Math.round(revenue / rows.length) : 0,
        completed,
        cancelled,
        completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
        newUsers,
        incompleteUsers,
        activeServices: (services || []).filter((service) => service.is_active).length,
      },
      statusCounts,
      topServices: Object.entries(serviceStats)
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
        .slice(0, 10),
      daily: Object.entries(daily)
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      services: services || [],
      statuses: ["registered", "checking", "need_documents", "processing", "ready", "completed", "cancelled"],
    });
  } catch (error) {
    console.error("[admin/reports] failed", { adminId: admin.id, error });
    return NextResponse.json({ success: false, error: "دریافت گزارش‌ها ناموفق بود." }, { status: 500 });
  }
}
