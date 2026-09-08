import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_ACCESS_CACHE_COOKIE = "tusan_admin_access";
export const ADMIN_ACCESS_CACHE_TTL_SECONDS = 20 * 60;

type AdminAccessPayload = {
    sub: string;
    sid: string;
    ip: string;
    exp: number;
};

function getSecret() {
    return process.env.ADMIN_ACCESS_CACHE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function normalizeIp(ip: string | null | undefined) {
    const value = ip?.trim() || "unknown";
    return value.split(",")[0]?.trim() || "unknown";
}

function sign(value: string) {
    const secret = getSecret();
    if (!secret) return "";
    return createHmac("sha256", secret).update(value).digest("base64url");
}

export function getRequestIp(request: { headers: { get(name: string): string | null } }) {
    return normalizeIp(
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        request.headers.get("x-vercel-forwarded-for")
    );
}

export function createAdminAccessToken(payload: AdminAccessPayload) {
    if (!getSecret()) return null;
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = sign(body);
    return `${body}.${signature}`;
}

export function verifyAdminAccessToken(
    token: string | undefined,
    expected: { sub: string; sid: string; ip: string },
    now = Math.floor(Date.now() / 1000)
) {
    const secret = getSecret();
    if (!secret || !token) return false;

    const separator = token.lastIndexOf(".");
    if (separator <= 0) return false;

    const body = token.slice(0, separator);
    const providedSignature = token.slice(separator + 1);
    const expectedSignature = sign(body);

    try {
        const provided = Buffer.from(providedSignature, "base64url");
        const expectedBuffer = Buffer.from(expectedSignature, "base64url");
        if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) {
            return false;
        }

        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<AdminAccessPayload>;
        return Boolean(
            payload.sub === expected.sub &&
            payload.sid === expected.sid &&
            payload.ip === normalizeIp(expected.ip) &&
            typeof payload.exp === "number" &&
            payload.exp > now
        );
    } catch {
        return false;
    }
}

export function getAdminAccessCookieOptions(maxAge = ADMIN_ACCESS_CACHE_TTL_SECONDS) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge,
    };
}
