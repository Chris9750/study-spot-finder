import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "sharp"],
  agentRules: false,
};

export default nextConfig;
