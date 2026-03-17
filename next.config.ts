import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    /**
     * Allow larger multipart/form-data requests for local uploads.
     *
     * Without this, Next.js can reject bigger payloads before reaching
     * our `/api/upload` route, resulting in HTTP 413 responses.
     */
    proxyClientMaxBodySize: 1024 * 1024 * 1024,
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
  /**
   * Nodemailer is a Node.js-only package. Keep it external so Next.js does
   * not attempt to bundle it for server targets.
   */
  serverExternalPackages: ["nodemailer"],
  images: {
    /**
     * The built-in Next.js image optimizer can become a bottleneck (or return
     * 502 upstream) on small servers when many remote images are requested.
     *
     * We serve images directly to reduce server-side CPU/memory pressure and
     * avoid proxying every avatar/thumbnail through `/_next/image`.
     */
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
