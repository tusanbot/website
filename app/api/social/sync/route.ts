import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getFJPanelServices, type FJPanelService } from "@/lib/social/fjpanel";

export const dynamic = "force-dynamic";

const PLATFORM_RULES = [
    { slug: "instagram", name: "اینستاگرام", icon: "instagram", keywords: ["instagram", "insta", "اینستاگرام"] },
    { slug: "telegram", name: "تلگرام", icon: "send", keywords: ["telegram", "تلگرام"] },
    { slug: "youtube", name: "یوتیوب", icon: "youtube", keywords: ["youtube", "yt", "یوتیوب"] },
    { slug: "tiktok", name: "تیک‌تاک", icon: "music-2", keywords: ["tiktok", "tik tok", "تیک تاک", "تیک‌تاک"] },
    { slug: "facebook", name: "فیسبوک", icon: "users", keywords: ["facebook", "fb", "فیسبوک"] },
    { slug: "twitter", name: "ایکس / توییتر", icon: "at-sign", keywords: ["twitter", "x.com", " x ", "توییتر", "ایکس"] },
    { slug: "linkedin", name: "لینکدین", icon: "users", keywords: ["linkedin", "لینکدین"] },
    { slug: "spotify", name: "اسپاتیفای", icon: "play-square", keywords: ["spotify", "اسپاتیفای"] },
    { slug: "rubika", name: "روبیکا", icon: "message-circle", keywords: ["rubika", "روبیکا"] },
    { slug: "eitaa", name: "ایتا", icon: "message-square", keywords: ["eitaa", "ایتا"] },
    { slug: "aparat", name: "آپارات", icon: "play-square", keywords: ["aparat", "آپارات"] },
];

const CATEGORY_RULES = [
    { slug: "followers", name: "فالوور", keywords: ["follower", "followers", "follow", "فالوور", "دنبال کننده", "دنبال‌کننده"] },
    { slug: "likes", name: "لایک", keywords: ["like", "likes", "لایک"] },
    { slug: "views", name: "بازدید", keywords: ["view", "views", "بازدید", "ویو"] },
    { slug: "comments", name: "کامنت", keywords: ["comment", "comments", "کامنت"] },
    { slug: "members", name: "عضو", keywords: ["member", "members", "ممبر", "عضو"] },
    { slug: "subscribers", name: "سابسکرایب", keywords: ["subscriber", "subscribers", "subscribe", "سابسکرایب", "مشترک"] },
    { slug: "shares", name: "اشتراک‌گذاری", keywords: ["share", "shares", "اشتراک"] },
    { slug: "saves", name: "ذخیره", keywords: ["save", "saves", "ذخیره"] },
    { slug: "reactions", name: "ری‌اکشن", keywords: ["reaction", "reactions", "ری‌اکشن"] },
    { slug: "stories", name: "استوری", keywords: ["story", "stories", "استوری"] },
];

function normalize(value: string) {
    return value.toLowerCase().replace(/[‌]/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}
function containsKeyword(text: string, keyword: string) { return text.includes(normalize(keyword)); }
function detectPlatform(service: FJPanelService) {
    const text = normalize(`${service.category} ${service.name}`);
    return PLATFORM_RULES.find((rule) => rule.keywords.some((keyword) => containsKeyword(text, keyword))) ?? { slug: "other", name: "سایر شبکه‌ها", icon: "message-circle" };
}
function detectCategory(service: FJPanelService) {
    const text = normalize(`${service.category} ${service.name}`);
    return CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => containsKeyword(text, keyword))) ?? { slug: "other", name: "سایر خدمات" };
}
function parsePositiveInteger(value: string | undefined, fallback = 1) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseRate(value: string | undefined) {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function getRequestUser(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await client.auth.getUser();
    return data.user ?? null;
}
async function isAuthorized(request: NextRequest) {
    const syncSecret = process.env.SOCIAL_SYNC_SECRET;
    const suppliedSecret = request.headers.get("x-social-sync-secret");
    if (syncSecret && suppliedSecret && suppliedSecret === syncSecret) return true;
    const user = await getRequestUser(request);
    if (!user) return false;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return false;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return profile?.role === "admin";
}

export async function GET() {
    return NextResponse.json({ ok: true, route: "social-sync", message: "Social sync endpoint is available" });
}

export async function POST(request: NextRequest) {
    try {
        if (!(await isAuthorized(request))) return NextResponse.json({ error: "اجازه دسترسی به همگام‌سازی سرویس‌ها را ندارید." }, { status: 403 });
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });
        const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const providerServices = await getFJPanelServices();
        if (!Array.isArray(providerServices)) return NextResponse.json({ error: "پاسخ سرویس‌ها از FJPanel معتبر نیست." }, { status: 502 });
        const platformCache = new Map<string, string>();
        const categoryCache = new Map<string, string>();
        let createdOrUpdated = 0;
        let skipped = 0;
        for (const providerService of providerServices) {
            if (!providerService?.service || !providerService.name) { skipped += 1; continue; }
            const platform = detectPlatform(providerService);
            const category = detectCategory(providerService);
            const platformKey = platform.slug;
            let platformId = platformCache.get(platformKey);
            if (!platformId) {
                const { data, error } = await admin.from("social_platforms").upsert({ name: platform.name, slug: platform.slug, icon: platform.icon, description: `خدمات ${platform.name}`, is_active: true, sort_order: 100 }, { onConflict: "slug" }).select("id").single();
                if (error || !data) throw new Error(`platform upsert failed: ${error?.message || platform.slug}`);
                platformId = data.id;
                platformCache.set(platformKey, platformId);
            }
            if (!platformId) throw new Error(`platform id is missing for ${platform.slug}`);
            const categoryKey = `${platformId}:${category.slug}`;
            let categoryId = categoryCache.get(categoryKey);
            if (!categoryId) {
                const { data, error } = await admin.from("social_categories").upsert({ platform_id: platformId, name: category.name, slug: category.slug, description: `خدمات ${category.name}`, is_active: true, sort_order: 100 }, { onConflict: "platform_id,slug" }).select("id").single();
                if (error || !data) throw new Error(`category upsert failed: ${error?.message || category.slug}`);
                categoryId = data.id;
                categoryCache.set(categoryKey, categoryId);
            }
            if (!categoryId) throw new Error(`category id is missing for ${category.slug}`);
            const minQuantity = parsePositiveInteger(providerService.min);
            const maxQuantity = Math.max(minQuantity, parsePositiveInteger(providerService.max, minQuantity));
            const providerRate = parseRate(providerService.rate);
            const { error } = await admin.from("social_services").upsert({ platform_id: platformId, category_id: categoryId, provider: "fjpanel", provider_service_id: String(providerService.service), name: providerService.name.trim(), description: providerService.category ? `دسته: ${providerService.category}` : null, service_type: providerService.type || "default", provider_rate: providerRate, min_quantity: minQuantity, max_quantity: maxQuantity, is_active: true }, { onConflict: "provider,provider_service_id" });
            if (error) throw new Error(`service upsert failed for ${providerService.service}: ${error.message}`);
            createdOrUpdated += 1;
        }
        return NextResponse.json({ success: true, provider: "fjpanel", received: providerServices.length, synced: createdOrUpdated, skipped, syncedAt: new Date().toISOString() });
    } catch (error) {
        console.error("[social/fjpanel-sync]", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته در همگام‌سازی سرویس‌ها" }, { status: 500 });
    }
}
