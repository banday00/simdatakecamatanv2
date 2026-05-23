import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
    // Security: hide technology fingerprint
    poweredByHeader: false,

    // Security: prevent source code exposure in production
    productionBrowserSourceMaps: false,

    // Security headers (defense-in-depth, covers static assets not in proxy)
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "X-DNS-Prefetch-Control", value: "on" },
                    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org",
                            "connect-src 'self' https://*.supabase.co https://svc-n8n.kotabogor.go.id",
                            "frame-ancestors 'none'",
                            "worker-src 'self'",
                        ].join("; "),
                    },
                ],
            },
        ];
    },

    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
        ],
    },
    output: "standalone",
};

export default withSerwist(nextConfig);
