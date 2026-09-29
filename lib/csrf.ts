import crypto from "crypto"
import { NextRequest } from "next/server"

const CSRF_COOKIE = "csrfToken"
const CSRF_HEADER = "x-csrf-token"

export function generateCsrfToken() {
  return crypto
    .randomBytes(32)
    .toString("hex")
}

export function getCsrfToken(
  req: NextRequest
) {
  return req.cookies
    .get(CSRF_COOKIE)
    ?.value
}

export function getCsrfHeader(
  req: NextRequest
) {
  return req.headers.get(
    CSRF_HEADER
  )
}

export function verifyCsrfToken(
  req: NextRequest
) {
  const cookieToken =
    getCsrfToken(req)

  const headerToken =
    getCsrfHeader(req)

  if (
    !cookieToken ||
    !headerToken
  ) {
    return false
  }

  const cookieBuffer =
    Buffer.from(cookieToken)

  const headerBuffer =
    Buffer.from(headerToken)

  if (
    cookieBuffer.length !==
    headerBuffer.length
  ) {
    return false
  }

  return crypto.timingSafeEqual(
    cookieBuffer,
    headerBuffer
  )
}