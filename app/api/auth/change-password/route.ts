import {
  NextRequest,
  NextResponse,
} from "next/server"

import bcrypt from "bcryptjs"

import { authenticate } from "@/lib/auth"
import { getDb } from "@/lib/db"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  validatePassword,
} from "@/lib/password"

import { logAudit } from "@/lib/audit"

import {
  getRequestInfo,
} from "@/lib/request-info"

import {
  isPasswordReused,
  savePasswordHistory,
} from "@/lib/password-history"


export async function POST(
  req: NextRequest
) {
  try {
    // =========================
    // 1. CSRF
    // =========================

    requireCsrf(req)

    // =========================
    // 2. AUTHENTICATE
    // =========================

    const user =
      await authenticate(req)

    // =========================
    // 3. REQUEST INFO
    // =========================

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // =========================
    // 4. READ BODY
    // =========================

    const body =
      await req.json()

    const {
      currentPassword,
      newPassword,
    }: {
      currentPassword?: string
      newPassword?: string
    } = body

    // =========================
    // 5. BASIC VALIDATION
    // =========================

    if (
      typeof currentPassword !==
        "string" ||
      typeof newPassword !==
        "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Current password and new password are required",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 6. VALIDATE NEW PASSWORD
    // =========================

    const passwordValidation =
      validatePassword(
        newPassword
      )

    if (
      !passwordValidation.valid
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            passwordValidation.message,
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 7. CHECK CURRENT PASSWORD
    // =========================

    const passwordMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      )

    if (!passwordMatch) {
      await logAudit({
        userId: user._id,

        action:
          "PASSWORD_CHANGE_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "INVALID_CURRENT_PASSWORD",
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "Current password is incorrect",
        },
        {
          status: 401,
        }
      )
    }

    // =========================
    // 8. PREVENT SAME PASSWORD
    // =========================

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      )

    if (samePassword) {
      await logAudit({
        userId: user._id,

        action:
          "PASSWORD_CHANGE_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "SAME_AS_CURRENT_PASSWORD",
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "New password must be different from current password",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 9. PASSWORD HISTORY
    // =========================

    const reused =
      await isPasswordReused(
        user._id!,
        newPassword
      )

    if (reused) {
      await logAudit({
        userId: user._id,

        action:
          "PASSWORD_CHANGE_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "PASSWORD_REUSED",
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot reuse one of your last 5 passwords",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 10. DATABASE
    // =========================

    const db =
      await getDb()

    // =========================
    // 11. SAVE CURRENT PASSWORD
    // =========================

    await savePasswordHistory(
      user._id!,
      user.password
    )

    // =========================
    // 12. HASH NEW PASSWORD
    // =========================

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      )

    // =========================
    // 13. UPDATE PASSWORD
    // =========================

    const users =
      db.collection(
        "adminUser"
      )

    const updateResult =
      await users.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            password:
              hashedPassword,
          },
        }
      )

    if (
      updateResult.modifiedCount !==
      1
    ) {
      throw new Error(
        "Password update failed"
      )
    }

    // =========================
    // 14. REVOKE ALL SESSIONS
    // =========================

    const refreshTokens =
      db.collection(
        "refresh_tokens"
      )

    const sessionResult =
      await refreshTokens.updateMany(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt:
              new Date(),
          },
        }
      )

    // =========================
    // 15. AUDIT SUCCESS
    // =========================

    await logAudit({
      userId: user._id,

      action:
        "PASSWORD_CHANGED",

      ip,

      userAgent,

      metadata: {
        success: true,

        sessionsRevoked:
          sessionResult.modifiedCount,

        passwordHistoryChecked:
          true,
      },
    })

    // =========================
    // 16. CREATE RESPONSE
    // =========================

    const response =
      NextResponse.json({
        success: true,

        message:
          "Password changed successfully. Please login again.",
      })

    // =========================
    // 17. CLEAR ACCESS COOKIE
    // =========================

    response.cookies.set(
      "accessToken",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge: 0,
      }
    )

    // =========================
    // 18. CLEAR REFRESH COOKIE
    // =========================

    response.cookies.set(
      "refreshToken",
      "",
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge: 0,
      }
    )

    return response
  } catch (error) {
    // =========================
    // ERROR
    // =========================

    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unable to change password"

    // =========================
    // CSRF
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
    // AUTHENTICATION
    // =========================

    if (
      message ===
        "Authentication required" ||
      message ===
        "Token has been revoked" ||
      message ===
        "Session has been terminated" ||
      message ===
        "User account is inactive"
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
    // DEFAULT
    // =========================

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    )
  }
}