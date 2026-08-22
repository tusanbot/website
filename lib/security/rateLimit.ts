import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 10;
const MAX_JSON_BODY_BYTES = 16 * 1024;

type RateLimitOptions = {
    scope: string;
    request: NextRequest;
    userId?: string | null;
    limit?: number;
    windowSeconds?: number;
};

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Supabase server configuration is incomplete");
    }

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

function getClientAddress(request: NextRequest) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "unknown";
    }

    return (
        request.headers.get("x-real-ip")?.trim() ||
        request.headers.get("cf-connecting-ip")?.trim() ||
        "unknown"
    );
}

function hashKey(value: string) {
    return createHash("sha256")
        .update(value)
        .digest("hex");
}

export async function checkRateLimit({
    scope,
    request,
    userId,
    limit = DEFAULT_LIMIT,
    windowSeconds = DEFAULT_WINDOW_SECONDS,
}: RateLimitOptions) {
    const identity = userId
        ? `user:${userId}`
        : `ip:${getClientAddress(request)}`;

    const key = hashKey(`${scope}:${identity}`);

    try {
        const { data, error } = await getAdminClient().rpc(
            "consume_api_rate_limit",
            {
                p_key: key,
                p_limit: limit,
                p_window_seconds: windowSeconds,
            }
        );

        if (error) {
            throw new Error(error.message);
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.allowed) {
            const retryAfter = Math.max(
                1,
                Number(result?.retry_after_seconds || windowSeconds)
            );

            return NextResponse.json(
                {
                    error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(retryAfter),
                        "Cache-Control": "no-store",
                    },
                }
            );
        }

        return null;
    } catch (error) {
        console.error("[security/rate-limit]", error);

        // Fail closed for protected mutation endpoints. If the limiter itself
        // is unavailable, do not allow the protected operation to continue.
        return NextResponse.json(
            {
                error: "سامانه امنیتی موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
            },
            {
                status: 503,
                headers: {
                    "Retry-After": "10",
                    "Cache-Control": "no-store",
                },
            }
        );
    }
}

export function rejectOversizedJsonBody(
    request: NextRequest,
    maxBytes = MAX_JSON_BODY_BYTES
) {
    const contentLength = request.headers.get("content-length");

    if (!contentLength) {
        return null;
    }

    const size = Number(contentLength);

    if (!Number.isFinite(size) || size < 0) {
        return NextResponse.json(
            { error: "اندازه درخواست معتبر نیست." },
            { status: 400 }
        );
    }

    if (size > maxBytes) {
        return NextResponse.json(
            { error: "حجم درخواست بیش از حد مجاز است." },
            { status: 413 }
        );
    }

    return null;
}
