import { SignJWT, jwtVerify } from "jose"
import crypto from "crypto"

import { UserRole } from "./types"

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET!
)

const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET!
)

export async function createAccessToken(
  userId: string,
  role: UserRole,
  sessionId: string
) {
  const jti = crypto.randomUUID()

  return new SignJWT({
    type: "access",
    role,
    sessionId,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret)
}

export async function verifyAccessToken(
  token: string
) {
  return jwtVerify(token, accessSecret)
}

export async function createRefreshToken(
  userId: string,
  sessionId: string
) {
  const jti = crypto.randomUUID()

  return new SignJWT({
    type: "refresh",
    sessionId,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(refreshSecret)
}

export async function verifyRefreshToken(
  token: string
) {
  return jwtVerify(token, refreshSecret)
}

export function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex")
}