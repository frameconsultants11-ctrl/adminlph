import { ObjectId } from "mongodb"

import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "@/lib/token"

import { getDb } from "@/lib/db"

import {
  RefreshTokenDocument,
} from "@/lib/types"

export async function refreshSession(
  refreshToken: string
) {
  // --------------------------------
  // VERIFY REFRESH JWT
  // --------------------------------

  const { payload } =
    await verifyRefreshToken(
      refreshToken
    )

  console.log(
    "REFRESH PAYLOAD:",
    payload
  )

  // --------------------------------
  // VALIDATE PAYLOAD
  // --------------------------------

  if (
    payload.type !== "refresh" ||
    !payload.sub ||
    !payload.jti ||
    typeof payload.sessionId !==
      "string"
  ) {
    throw new Error(
      "Invalid refresh token"
    )
  }

  const sessionId =
    payload.sessionId

  // --------------------------------
  // CONVERT USER ID
  // --------------------------------

  let userId: ObjectId

  try {
    userId = new ObjectId(
      payload.sub
    )
  } catch {
    throw new Error(
      "Invalid user ID"
    )
  }

  // --------------------------------
  // HASH REFRESH TOKEN
  // --------------------------------

  const tokenHash =
    hashToken(refreshToken)

  // --------------------------------
  // DATABASE
  // --------------------------------

  const db = await getDb()

  const refreshTokens =
    db.collection<RefreshTokenDocument>(
      "refresh_tokens"
    )

  // --------------------------------
  // FIND STORED REFRESH TOKEN
  // --------------------------------

  const storedToken =
    await refreshTokens.findOne({
      tokenHash,
      userId,
      sessionId,
      revokedAt: null,
    })

  if (!storedToken) {
    throw new Error(
      "Refresh token is invalid or already used"
    )
  }

  // --------------------------------
  // CHECK EXPIRATION
  // --------------------------------

  if (
    storedToken.expiresAt <=
    new Date()
  ) {
    throw new Error(
      "Refresh token expired"
    )
  }

  // --------------------------------
  // FIND USER
  // --------------------------------

  const users =
    db.collection("adminUser")

  const user =
    await users.findOne({
      _id: userId,
    })

  if (!user) {
    // User no longer exists.
    // Revoke this session.

    await refreshTokens.updateMany(
      {
        userId,
        sessionId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    )

    throw new Error(
      "User not found"
    )
  }

  // --------------------------------
  // CHECK ACCOUNT STATUS
  // --------------------------------

  if (!user.isActive) {
    // Account was deactivated.
    // Kill all sessions for this user.

    await refreshTokens.updateMany(
      {
        userId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    )

    throw new Error(
      "User account is inactive"
    )
  }

  // --------------------------------
  // REVOKE OLD REFRESH TOKEN
  // --------------------------------

  const revokeResult =
    await refreshTokens.updateOne(
      {
        _id: storedToken._id,
        tokenHash,
        sessionId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      }
    )

  // --------------------------------
  // ROTATION RACE PROTECTION
  // --------------------------------

  if (
    revokeResult.modifiedCount !== 1
  ) {
    throw new Error(
      "Refresh token already used"
    )
  }

  // --------------------------------
  // CREATE NEW ACCESS TOKEN
  // --------------------------------

  const accessToken =
    await createAccessToken(
      userId.toString(),
      user.role,
      sessionId
    )

  // --------------------------------
  // CREATE NEW REFRESH TOKEN
  // --------------------------------

  const newRefreshToken =
    await createRefreshToken(
      userId.toString(),
      sessionId
    )

  // --------------------------------
  // STORE NEW REFRESH TOKEN
  // --------------------------------

  const newRefreshTokenDocument:
    RefreshTokenDocument = {
    userId,

    sessionId,

    tokenHash:
      hashToken(
        newRefreshToken
      ),

    deviceId:
      storedToken.deviceId,

    deviceName:
      storedToken.deviceName,

    expiresAt: new Date(
      Date.now() +
        30 *
          24 *
          60 *
          60 *
          1000
    ),

    revokedAt: null,

    createdAt: new Date(),

    lastUsedAt: new Date(),
  }

  await refreshTokens.insertOne(
    newRefreshTokenDocument
  )

  // --------------------------------
  // RETURN
  // --------------------------------

  return {
    accessToken,

    refreshToken:
      newRefreshToken,

    user,

    sessionId,
  }
}