import type { NextConfig } from "next";
import path from "node:path";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  outputFileTracingIncludes: {
    '/api/profile/avatar': [
      '../../node_modules/@napi-rs/canvas/**/*',
      '../../node_modules/@napi-rs/canvas-linux-x64-gnu/**/*',
    ],
    // Today is a DTO-only read route. All other routes retain the existing
    // native/PDF asset packaging, including dynamically loaded write handlers.
    "/{.well-known,api/{auto-reviewer-preferences,canvas,cron,experience,health,internal,jobs,job-uploads,notification-devices,notification-preferences,notifications,ocr,reviewer,reviewers,sources,study-plan,study-sessions,tasks}}": [
      "../../node_modules/@napi-rs/canvas/**/*",
      "../../node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "../../node_modules/pdfjs-dist/**/*",
    ],
  },
  // Workflow selects the Vercel world at runtime. Keeping the local queue
  // implementation external prevents Next from evaluating its CLI-only path
  // discovery code while collecting production route metadata on Windows.
  serverExternalPackages: [
    "@napi-rs/canvas",
    "pdfjs-dist",
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
