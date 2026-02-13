import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Nodemailer is a Node.js-only package. Keep it external so Next.js does
   * not attempt to bundle it for server targets.
   */
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
