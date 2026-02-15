import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Nodemailer is a Node.js-only package. Keep it external so Next.js does
   * not attempt to bundle it for server targets.
   */
  serverExternalPackages: ["nodemailer"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
