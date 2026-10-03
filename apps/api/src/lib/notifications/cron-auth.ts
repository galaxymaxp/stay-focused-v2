import { timingSafeEqual } from "node:crypto";

export function authorizedCanvasCron(request: Request, secret = process.env.CRON_SECRET): boolean {
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret?.trim()) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
