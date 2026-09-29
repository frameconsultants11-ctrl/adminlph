import { NextRequest } from "next/server"

export function getRequestInfo(
  req: NextRequest
) {
  const forwardedFor =
    req.headers.get("x-forwarded-for")

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const userAgent =
    req.headers.get("user-agent") ||
    "unknown"

  return {
    ip,
    userAgent,
  }
}