import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  // Workflow selects the Vercel world at runtime. Keeping the local queue
  // implementation external prevents Next from evaluating its CLI-only path
  // discovery code while collecting production route metadata on Windows.
  serverExternalPackages: [
    "@napi-rs/canvas",
    "@vercel/queue",
    "@workflow/world-local",
  ],
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

export default withWorkflow(nextConfig);
