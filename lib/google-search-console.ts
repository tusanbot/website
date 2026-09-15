import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://www.googleapis.com/webmasters/v3";

type ServiceAccount = { client_email: string; private_key: string };
type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
      if (parsed.client_email && parsed.private_key) return parsed as ServiceAccount;
    } catch {}
  }
  const client_email = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return client_email && private_key ? { client_email, private_key } : null;
}

export function getSearchConsoleConfig() {
  const account = getServiceAccount();
  return {
    configured: Boolean(account),
    siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || "https://www.tusancn.ir/",
    accountEmail: account?.client_email ?? null,
  };
}

async function getAccessToken() {
  const account = getServiceAccount();
  if (!account) throw new Error("Google Search Console is not configured.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({ iss: account.client_email, scope: SEARCH_CONSOLE_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64Url(signer.sign(account.private_key));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status}).`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("Google OAuth did not return an access token.");
  return data.access_token;
}

async function querySearchConsole(startDate: string, endDate: string, dimensions: string[]) {
  const token = await getAccessToken();
  const { siteUrl } = getSearchConsoleConfig();
  const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 250 }),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search Console API ${response.status}: ${text.slice(0, 300)}`);
  }
  return (await response.json()) as { rows?: SearchRow[] };
}

export async function getSearchConsoleDashboard(days: number) {
  const safeDays = Math.min(90, Math.max(7, Math.floor(days)));
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - safeDays + 1);
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - safeDays + 1);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  const [current, previous, trend, queries, pages] = await Promise.all([
    querySearchConsole(iso(start), iso(end), []),
    querySearchConsole(iso(previousStart), iso(previousEnd), []),
    querySearchConsole(iso(start), iso(end), ["date"]),
    querySearchConsole(iso(start), iso(end), ["query"]),
    querySearchConsole(iso(start), iso(end), ["page"]),
  ]);

  const aggregate = (rows: SearchRow[] = []) => {
    const impressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    const clicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const ctr = impressions ? clicks / impressions : 0;
    const positionWeight = rows.reduce((sum, row) => sum + Number(row.position || 0) * Number(row.impressions || 0), 0);
    return { clicks, impressions, ctr, position: impressions ? positionWeight / impressions : 0 };
  };
  const metrics = aggregate(current.rows);
  const previousMetrics = aggregate(previous.rows);
  const pct = (value: number, old: number) => old ? ((value - old) / old) * 100 : null;
  const normalized = (rows: SearchRow[] = []) => rows.map(row => ({
    key: row.keys?.[0] || "—",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));

  return {
    siteUrl: getSearchConsoleConfig().siteUrl,
    range: { start: iso(start), end: iso(end), days: safeDays },
    metrics,
    previousMetrics,
    changes: {
      clicks: pct(metrics.clicks, previousMetrics.clicks),
      impressions: pct(metrics.impressions, previousMetrics.impressions),
      ctr: pct(metrics.ctr, previousMetrics.ctr),
      position: previousMetrics.position ? metrics.position - previousMetrics.position : null,
    },
    trend: normalized(trend.rows).map(row => ({ date: row.key, ...row })),
    queries: normalized(queries.rows).sort((a, b) => b.clicks - a.clicks).slice(0, 20),
    pages: normalized(pages.rows).sort((a, b) => b.clicks - a.clicks).slice(0, 20),
  };
}
