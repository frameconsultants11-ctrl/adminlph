import {
  NextRequest,
  NextResponse,
} from "next/server"

import { ObjectId } from "mongodb"

import bcrypt from "bcryptjs"

import { getDb } from "@/lib/db"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import { requireCsrf } from "@/lib/require-csrf"

import {
  getRequestInfo,
} from "@/lib/request-info"

import { logAudit } from "@/lib/audit"

import {
  validatePassword,
} from "@/lib/password"

import {
  isPasswordReused,
  savePasswordHistory,
} from "@/lib/password-history"


type Params = {
  params: Promise<{
    id: string
  }>
}


export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    // =========================
    // 1. CSRF
    // =========================

    requireCsrf(req)

    // =========================
    // 2. AUTHENTICATE
    // =========================

    const admin =
      await authenticate(req)

    // =========================
    // 3. ADMIN ONLY
    // =========================

    authorize(
      admin,
      "admin"
    )

    // =========================
    // 4. REQUEST INFO
    // =========================

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // =========================
    // 5. GET USER ID
    // =========================

    const { id } =
      await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user ID",
        },
        {
          status: 400,
        }
      )
    }

    const userId =
      new ObjectId(id)

    // =========================
    // 6. READ BODY
    // =========================

    const body =
      await req.json()

    const {
      newPassword,
    }: {
      newPassword?: string
    } = body

    // =========================
    // 7. VALIDATE PASSWORD
    // =========================

    if (
      typeof newPassword !==
        "string" ||
      !newPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password is required",
        },
        {
          status: 400,
        }
      )
    }

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
    // 8. DATABASE
    // =========================

    const db =
      await getDb()

    const users =
      db.collection(
        "adminUser"
      )

    const refreshTokens =
      db.collection(
        "refresh_tokens"
      )

    // =========================
    // 9. FIND USER
    // =========================

    const user =
      await users.findOne({
        _id: userId,
      })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User not found",
        },
        {
          status: 404,
        }
      )
    }

    // =========================
    // 10. CHECK SAME PASSWORD
    // =========================

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      )

    if (samePassword) {
      await logAudit({
        userId: admin._id,

        action:
          "PASSWORD_CHANGE_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "SAME_AS_CURRENT_PASSWORD",

          targetUserId:
            userId.toString(),

          targetUserEmail:
            user.email,
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
    // 11. CHECK PASSWORD HISTORY
    // =========================

    const reused =
      await isPasswordReused(
        userId,
        newPassword
      )

    if (reused) {
      await logAudit({
        userId: admin._id,

        action:
          "PASSWORD_CHANGE_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "PASSWORD_REUSED",

          targetUserId:
            userId.toString(),

          targetUserEmail:
            user.email,
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "Password cannot match one of the user's last 5 passwords",
        },
        {
          status: 400,
        }
      )
    }

    // =========================
    // 12. SAVE CURRENT PASSWORD
    // =========================

    await savePasswordHistory(
      userId,
      user.password
    )

    // =========================
    // 13. HASH NEW PASSWORD
    // =========================

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      )

    // =========================
    // 14. UPDATE PASSWORD
    // =========================

    const result =
      await users.updateOne(
        {
          _id: userId,
        },
        {
          $set: {
            password:
              hashedPassword,
          },
        }
      )

    if (
      result.modifiedCount !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password was not changed",
        },
        {
          status: 500,
        }
      )
    }

    // =========================
    // 15. REVOKE ALL SESSIONS
    // =========================

    const sessionResult =
      await refreshTokens.updateMany(
        {
          userId,
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
    // 16. AUDIT LOG
    // =========================

    await logAudit({
      userId: admin._id,

      action:
        "PASSWORD_RESET",

      ip,

      userAgent,

      metadata: {
        targetUserId:
          userId.toString(),

        targetUserEmail:
          user.email,

        targetUserName:
          user.name,

        resetBy:
          admin._id?.toString(),

        sessionsRevoked:
          sessionResult.modifiedCount,

        passwordHistoryChecked:
          true,
      },
    })

    // =========================
    // 17. RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      message:
        "Password reset successfully",

      sessionsRevoked:
        sessionResult.modifiedCount,
    })
  } catch (error) {
    console.error(
      "ADMIN PASSWORD RESET ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to reset password"

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
    // AUTHORIZATION
    // =========================

    if (
      message.includes(
        "permission"
      )
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
        message:
          "Failed to reset password",
      },
      {
        status: 500,
      }
    )
  }
}