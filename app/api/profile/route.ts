import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  verifyAccessToken,
} from "@/lib/token"

import {
  authenticate,
} from "@/lib/auth"

import {
  refreshSession,
} from "@/lib/session"

export async function GET(
  req: NextRequest
) {
  try {
    // =========================
    // Try current access token
    // =========================

    const accessToken =
      req.cookies.get(
        "accessToken"
      )?.value

    if (accessToken) {
      try {
        const { payload } =
          await verifyAccessToken(
            accessToken
          )

        if (
          payload.type === "access"
        ) {
          const user =
            await authenticate(req)

          return NextResponse.json({
            success: true,

            user: {
              id: user._id?.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isActive:
                user.isActive,
            },
          })
        }
      } catch {
        // Access token expired.
        // Continue to refresh.
      }
    }

    // =========================
    // Access token failed
    // =========================

    const refreshToken =
      req.cookies.get(
        "refreshToken"
      )?.value

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        { status: 401 }
      )
    }

    // =========================
    // Refresh session
    // =========================

    const session =
      await refreshSession(
        refreshToken
      )

    // =========================
    // Create response
    // =========================

    const response =
      NextResponse.json({
        success: true,

        user: {
          id: session.user._id?.toString(),
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          isActive:
            session.user.isActive,
        },

        refreshed: true,
      })

    // New access cookie
    response.cookies.set(
      "accessToken",
      session.accessToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge: 15 * 60,
      }
    )

    // New refresh cookie
    response.cookies.set(
      "refreshToken",
      session.refreshToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

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
      "PROFILE ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Authentication required",
      },
      { status: 401 }
    )
  }
}