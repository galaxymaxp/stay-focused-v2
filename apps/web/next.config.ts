import type { NextConfig } from "next";

// The existing API remains the sole domain backend. A same-origin rewrite
// forwards bearer auth without introducing cookies or requiring mobile CORS changes.
const apiOrigin =
  process.env.STAY_FOCUSED_API_ORIGIN ?? "http://127.0.0.1:3000";
const parsed = new URL(apiOrigin);
if (
  !["http:", "https:"].includes(parsed.protocol) ||
  parsed.username ||
  parsed.password ||
  parsed.pathname !== "/" ||
  parsed.search ||
  parsed.hash
) {
  throw new Error("STAY_FOCUSED_API_ORIGIN must be an HTTP(S) origin.");
}
const config: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@stay-focused/shared"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${parsed.origin}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
