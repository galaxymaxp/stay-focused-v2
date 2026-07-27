import type { NextConfig } from "next";
import path from "node:path";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/@napi-rs/canvas/**/*",
      "../../node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
  },
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
