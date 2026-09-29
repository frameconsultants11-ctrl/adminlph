import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  checkRefreshRateLimit,
} from "@/lib/rate-limit"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  hashToken,
} from "@/lib/token"

import {
  refreshSession,
} from "@/lib/session"

import {
  logAudit,
} from "@/lib/audit"

import {
  getRequestInfo,
} from "@/lib/request-info"


export async function POST(
  req: NextRequest
) {
  try {
    // --------------------------------
    // CSRF PROTECTION
    // --------------------------------

    requireCsrf(req)

    // --------------------------------
    // REQUEST INFO
    // --------------------------------

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // --------------------------------
    // GET REFRESH TOKEN
    // --------------------------------

    const refreshToken =
      req.cookies.get(
        "refreshToken"
      )?.value

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Refresh token not found",
        },
        {
          status: 401,
        }
      )
    }

    // --------------------------------
    // REFRESH RATE LIMIT
    // --------------------------------

    const tokenHash =
      hashToken(refreshToken)

    const rateLimit =
      await checkRefreshRateLimit(
        tokenHash
      )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many refresh attempts. Please login again later.",
        },
        {
          status: 429,

          headers: {
            "Retry-After":
              rateLimit.retryAfter.toString(),
          },
        }
      )
    }

    // --------------------------------
    // ROTATE REFRESH SESSION
    // --------------------------------

    const session =
      await refreshSession(
        refreshToken
      )

    // --------------------------------
    // AUDIT
    // --------------------------------

    await logAudit({
      userId:
        session.user._id,

      action:
        "TOKEN_REFRESH",

      ip,

      userAgent,

      sessionId:
        session.sessionId,
    })

    // --------------------------------
    // RESPONSE
    // --------------------------------

    const response =
      NextResponse.json({
        success: true,

        user: {
          id:
            session.user._id?.toString(),

          name:
            session.user.name,

          email:
            session.user.email,

          role:
            session.user.role,

          isActive:
            session.user.isActive,
        },

        session: {
          sessionId:
            session.sessionId,
        },
      })

    // --------------------------------
    // ACCESS TOKEN
    // --------------------------------

    response.cookies.set(
      "accessToken",
      session.accessToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        maxAge:
          15 * 60,
      }
    )

    // --------------------------------
    // REFRESH TOKEN
    // --------------------------------

    response.cookies.set(
      "refreshToken",
      session.refreshToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        maxAge:
          30 *
          24 *
          60 *
          60,
      }
    )

    return response

  } catch (error) {
    console.error(
      "REFRESH ERROR:",
      error
    )

    // --------------------------------
    // CSRF ERROR
    // --------------------------------

    if (
      error instanceof Error &&
      error.message ===
        "Invalid CSRF token"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid CSRF token",
        },
        {
          status: 403,
        }
      )
    }

    // --------------------------------
    // REFRESH TOKEN ERRORS
    // --------------------------------

    if (
      error instanceof Error &&
      (
        error.message ===
          "Refresh token expired" ||

        error.message ===
          "Refresh token is invalid or already used" ||

        error.message ===
          "Invalid refresh token" ||

        error.message ===
          "Invalid user ID" ||

        error.message ===
          "User not found" ||

        error.message ===
          "User account is inactive" ||

        error.message ===
          "Session has been terminated"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status: 401,
        }
      )
    }

    // --------------------------------
    // UNEXPECTED ERROR
    // --------------------------------

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to refresh session",
      },
      {
        status: 500,
      }
    )
  }
}