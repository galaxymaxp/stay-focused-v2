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
// The Supabase anon/publishable key is public by design, but some Vercel teams
// force new variables to be sensitive, which `NEXT_PUBLIC_` names cannot be.
// Accept `NEXT_SUPABASE_ANON_KEY` as well, and refuse to inline anything that
// is not a public key so a pasted service-role key can never reach browsers.
function publicSupabaseKey() {
  const key =
    process.env.NEXT_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return undefined;
  if (key.startsWith("sb_secret_"))
    throw new Error("The Supabase key must be the publishable key, not a secret key.");
  if (key.startsWith("eyJ")) {
    let role: unknown;
    try {
      role = JSON.parse(
        Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"),
      ).role;
    } catch {
      throw new Error("The Supabase anon key is not a valid JWT.");
    }
    if (role !== "anon")
      throw new Error("The Supabase key must be the anon key, not a service-role key.");
  }
  return key;
}
const supabaseKey = publicSupabaseKey();
const config: NextConfig = {
  devIndicators: false,
  env: supabaseKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey } : {},
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
