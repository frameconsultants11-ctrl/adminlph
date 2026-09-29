// app/api/auth/logout/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server"

import { ObjectId } from "mongodb"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  verifyAccessToken,
  hashToken,
} from "@/lib/token"

import { getDb } from "@/lib/db"

import {
  BlacklistedToken,
  RefreshTokenDocument,
} from "@/lib/types"

import { logAudit } from "@/lib/audit"
import {
  getRequestInfo,
} from "@/lib/request-info"


export async function POST(
  req: NextRequest
) {
  try {
    // =========================
    // 1. CSRF PROTECTION
    // =========================

    requireCsrf(req)

    // =========================
    // 2. REQUEST INFO
    // =========================

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // =========================
    // 3. GET TOKENS
    // =========================

    const accessToken =
      req.cookies.get(
        "accessToken"
      )?.value

    const refreshToken =
      req.cookies.get(
        "refreshToken"
      )?.value

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Access token not found",
        },
        {
          status: 401,
        }
      )
    }

    // =========================
    // 4. VERIFY ACCESS TOKEN
    // =========================

    const {
      payload,
    } =
      await verifyAccessToken(
        accessToken
      )

    if (
      payload.type !== "access" ||
      !payload.sub ||
      !payload.jti ||
      !payload.exp ||
      typeof payload.sessionId !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid access token",
        },
        {
          status: 401,
        }
      )
    }

    // =========================
    // 5. CONVERT USER ID
    // =========================

    let userId: ObjectId

    try {
      userId =
        new ObjectId(
          payload.sub
        )
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user ID",
        },
        {
          status: 401,
        }
      )
    }

    const sessionId =
      payload.sessionId

    // =========================
    // 6. DATABASE
    // =========================

    const db =
      await getDb()

    // =========================
    // 7. BLACKLIST ACCESS TOKEN
    // =========================

    const blacklist:
      BlacklistedToken = {
      jti:
        payload.jti,

      userId,

      expiresAt:
        new Date(
          payload.exp * 1000
        ),

      createdAt:
        new Date(),
    }

    await db
      .collection<BlacklistedToken>(
        "blacklisted_tokens"
      )
      .updateOne(
        {
          jti:
            payload.jti,
        },
        {
          $setOnInsert:
            blacklist,
        },
        {
          upsert: true,
        }
      )

    // =========================
    // 8. REVOKE REFRESH TOKEN
    // =========================

    let refreshTokenRevoked =
      false

    if (refreshToken) {
      const refreshTokens =
        db.collection<RefreshTokenDocument>(
          "refresh_tokens"
        )

      const revokeResult =
        await refreshTokens.updateOne(
          {
            tokenHash:
              hashToken(
                refreshToken
              ),

            userId,

            sessionId,

            revokedAt:
              null,
          },
          {
            $set: {
              revokedAt:
                new Date(),

              lastUsedAt:
                new Date(),
            },
          }
        )

      refreshTokenRevoked =
        revokeResult.modifiedCount ===
        1
    }

    // =========================
    // 9. AUDIT LOG
    // =========================

    await logAudit({
      userId,

      action:
        "LOGOUT",

      ip,

      userAgent,

      sessionId,

      metadata: {
        accessTokenRevoked:
          true,

        refreshTokenRevoked,

        refreshTokenProvided:
          Boolean(
            refreshToken
          ),
      },
    })

    // =========================
    // 10. RESPONSE
    // =========================

    const response =
      NextResponse.json({
        success: true,

        message:
          "Logged out successfully",
      })

    // =========================
    // 11. CLEAR ACCESS TOKEN
    // =========================

    response.cookies.set(
      "accessToken",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        maxAge: 0,
      }
    )

    // =========================
    // 12. CLEAR REFRESH TOKEN
    // =========================

    response.cookies.set(
      "refreshToken",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        maxAge: 0,
      }
    )

    return response

  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to logout"

    // =========================
    // CSRF ERROR
    // =========================

    if (
      message ===
      "Invalid CSRF token"
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 403,
        }
      )
    }

    // =========================
    // AUTHENTICATION ERRORS
    // =========================

    if (
      message ===
        "Authentication required" ||
      message ===
        "Token has been revoked" ||
      message ===
        "Session has been terminated" ||
      message ===
        "User account is inactive" ||
      message ===
        "Invalid access token" ||
      message ===
        "Invalid user ID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 401,
        }
      )
    }

    // =========================
    // DEFAULT ERROR
    // =========================

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to logout",
      },
      {
        status: 500,
      }
    )
  }
}