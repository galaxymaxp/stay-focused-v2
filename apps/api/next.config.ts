import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stay-focused/db",
    "@stay-focused/engine",
    "@stay-focused/shared",
  ],
  webpack(config) {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
