import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", version: "2.1.0", commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
}
