import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Nodemailer is a Node.js-only package. Hint to Next.js that it should
     * keep it external when bundling server components so the runtime resolver
     * can load the dependency instead of the client/compiler trying to bundle
     * it, which resulted in a "Module not found" error during builds.
     */
    serverComponentsExternalPackages: ["nodemailer"],
  },
};

export default nextConfig;
