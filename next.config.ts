import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value:
            "camera=(), microphone=(), geolocation=(), payment=()",
    },
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "Strict-Transport-Security",
        value:
            "max-age=31536000; includeSubDomains",
    },
];

const contentSecurityPolicy = [
    "default-src 'self'",

    // JavaScript
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

    // CSS / Fonts
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",

    // Images
    "img-src 'self' data: blob: https:",

    // API / Supabase / external connections
    [
        "connect-src",
        "'self'",
        "https://*.supabase.co",
        "https://*.supabase.in",
        "https://fjpanel.com",
        "https://*.fjpanel.com",
        "https://vercel.live",
    ].join(" "),

    // Frames
    "frame-src 'self' https://*.supabase.co",

    // Objects / plugins
    "object-src 'none'",

    // Base URI
    "base-uri 'self'",

    // Forms
    "form-action 'self'",

    // Prevent embedding by other origins
    "frame-ancestors 'self'",

    // Workers
    "worker-src 'self' blob:",

    // Manifest
    "manifest-src 'self'",

    // Upgrade HTTP resources
    "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    ...securityHeaders,
                    {
                        key: "Content-Security-Policy",
                        value: contentSecurityPolicy,
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
