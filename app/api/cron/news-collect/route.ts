import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
}
function tag(item: string, name: string) {
  const match = item.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + "\\s*>", "i"));
  return match ? decodeXml(match[1]) : "";
}
function parseFeed(xml: string) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gi)];
  return blocks.map((match) => {
    const block = match[2];
    const linkTag = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const link = tag(block, "link") || linkTag?.[1] || "";
    const title = tag(block, "title");
    const description = tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded") || tag(block, "content");
    const guid = tag(block, "guid") || tag(block, "id") || link;
    const date = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    return { title, link: link.trim(), description, guid: guid.trim(), date };
  }).filter((item) => item.title && /^https?:\/\//i.test(item.link));
}
function makeSlug(title: string, guid: string) {
  const base = title.normalize("NFC").toLocaleLowerCase("fa").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 90);
  const suffix = Array.from(guid).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7).toString(36);
  return (base || "news") + "-" + suffix;
}
function plainText(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const secret = process.env.NEWS_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Missing Supabase server configuration" }, { status: 500 });
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sources, error: sourceError } = await supabase.from("news_sources").select("id,name,url,category").eq("is_active", true).limit(100);
  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

  const summary = { sources: sources?.length ?? 0, scanned: 0, queued: 0, duplicates: 0, errors: [] as string[] };
  for (const source of sources ?? []) {
    try {
      const response = await fetch(source.url, { headers: { "user-agent": "TusanNewsBot/1.0 (+https://www.tusancn.ir/news)" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const xml = await response.text();
      if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error("منبع RSS/Atom معتبر نیست");
      const items = parseFeed(xml).slice(0, 30);
      summary.scanned += items.length;
      for (const item of items) {
        const sourceGuid = source.id + ":" + item.guid;
        const { data: exists } = await supabase.from("news_announcements").select("id").or("source_url.eq." + item.link.replace(/[,.()]/g, "") + ",source_guid.eq." + sourceGuid.replace(/[,.()]/g, "")).limit(1).maybeSingle();
        if (exists) { summary.duplicates++; continue; }
        const description = plainText(item.description).slice(0, 1800);
        const { error } = await supabase.from("news_announcements").insert({
          title: item.title.slice(0, 240), slug: makeSlug(item.title, sourceGuid),
          excerpt: description.slice(0, 360) || null, content: description || item.title,
          category: source.category || "general", source_name: source.name, source_url: item.link,
          official_url: item.link, source_guid: sourceGuid, status: "review", published_at: null,
        });
        if (error) {
          if (error.code === "23505") { summary.duplicates++; continue; }
          throw new Error(error.message);
        }
        summary.queued++;
      }
      await supabase.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source error";
      summary.errors.push(source.name + ": " + message);
      await supabase.from("news_sources").update({ last_checked_at: new Date().toISOString(), last_error: message.slice(0, 500) }).eq("id", source.id);
    }
  }
  return NextResponse.json(summary);
}
