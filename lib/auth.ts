// lib/auth.ts

import { NextRequest } from "next/server"
import { ObjectId } from "mongodb"

import { verifyAccessToken } from "@/lib/token"
import { getDb } from "@/lib/db"
import { getUserCollection } from "@/models/user"
import { User, UserRole } from "@/lib/types"

export async function authenticate(
  req: NextRequest
): Promise<User> {
  const accessToken =
    req.cookies.get("accessToken")?.value

  if (!accessToken) {
    throw new Error("Authentication required")
  }

  const { payload } =
    await verifyAccessToken(accessToken)

  if (
    payload.type !== "access" ||
    !payload.sub ||
    !payload.jti ||
    typeof payload.sessionId !== "string"
  ) {
    throw new Error("Invalid access token")
  }

  const db = await getDb()

  // Check access token blacklist
  const blacklisted =
    await db.collection("blacklisted_tokens").findOne({
      jti: payload.jti,
    })

  if (blacklisted) {
    throw new Error("Token has been revoked")
  }

  let userId: ObjectId

  try {
    userId = new ObjectId(payload.sub)
  } catch {
    throw new Error("Invalid user ID")
  }

  // Check session
  const refreshTokens =
    db.collection("refresh_tokens")

  const activeSession =
    await refreshTokens.findOne({
      userId,
      sessionId: payload.sessionId,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    })

  if (!activeSession) {
    throw new Error("Session has been terminated")
  }

  // Get user
  const users = getUserCollection(db)

  const user =
    await users.findOne({
      _id: userId,
    })

  if (!user) {
    throw new Error("User not found")
  }

  if (!user.isActive) {
    throw new Error("User account is inactive")
  }

  return user
}

export function authorize(
  user: User,
  ...allowedRoles: UserRole[]
) {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      "You do not have permission to access this resource"
    )
  }

  return true
}