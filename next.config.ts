import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow longer serverless function execution for Groq API calls during demo
  serverExternalPackages: ["mongoose"],
};

export default nextConfig;
