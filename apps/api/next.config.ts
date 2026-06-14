import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stay-focused/db",
    "@stay-focused/engine",
    "@stay-focused/shared",
  ],
};

export default nextConfig;
