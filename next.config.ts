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
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    [
        "connect-src",
        "'self'",
        "https://*.supabase.co",
        "https://*.supabase.in",
        "https://fjpanel.com",
        "https://*.fjpanel.com",
        "https://vercel.live",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
    ].join(" "),
    "frame-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "worker-src 'self' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
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
                    { key: "X-Robots-Tag", value: "index, follow" },
                    { key: "Content-Security-Policy", value: contentSecurityPolicy },
                ],
            },
        ];
    },
};

export default nextConfig;
