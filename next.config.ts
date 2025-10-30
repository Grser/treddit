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
    /**
     * Route handlers are bundled separately from React Server Components. We
     * also need to mark Nodemailer as external there so the Next.js compiler
     * does not attempt to bundle it when generating the API route, which is
     * what triggered the "Module not found" error in production.
     */
    serverExternalPackages: ["nodemailer"],
  },
};

export default nextConfig;
