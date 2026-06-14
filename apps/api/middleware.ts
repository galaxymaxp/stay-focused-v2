import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // JWT verification will be added when authenticated routes are implemented.
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
