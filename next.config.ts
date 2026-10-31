import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://accounts.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    [
        "connect-src",
        "'self'",
        "https://*.supabase.co",
        "https://*.supabase.in",
        "wss://*.supabase.co",
        "wss://*.supabase.in",
        "https://accounts.google.com",
        "https://fjpanel.com",
        "https://*.fjpanel.com",
        "https://vercel.live",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
    ].join(" "),
    "frame-src 'self' https://*.supabase.co https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "worker-src 'self' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
    // Generate a self-contained Node.js release only for the cPanel packaging workflow.
    // Leave the standard Next.js output unchanged outside cPanel packaging.
    output: process.env.CPANEL_BUILD === "1" ? "standalone" : undefined,
    webpack(config) {
        // Explicit root alias for webpack builds; keeps @/ imports rooted at the repository.
        config.resolve.alias["@"] = path.resolve(process.cwd());
        return config;
    },
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    ...securityHeaders,
                    { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
                    { key: "Content-Security-Policy", value: contentSecurityPolicy },
                ],
            },
            {
                source: "/(.*)",
                headers: [
                    ...securityHeaders,
                    { key: "Content-Security-Policy", value: contentSecurityPolicy },
                ],
            },
        ];
    },
};

export default nextConfig;
