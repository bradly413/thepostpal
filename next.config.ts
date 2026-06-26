import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["remotion", "@remotion/player"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.anthropic.com https://graph.facebook.com https://api.vimeo.com https://generativelanguage.googleapis.com https://*.ingest.sentry.io https://*.sentry.io https://*.s3.us-east-2.amazonaws.com https://dugdppfv1e8wf.cloudfront.net; frame-src 'self' https://player.vimeo.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
