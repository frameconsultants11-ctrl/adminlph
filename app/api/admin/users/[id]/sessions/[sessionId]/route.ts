import {
  NextRequest,
  NextResponse,
} from "next/server"

import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import {
  authenticate,
  authorize,
} from "@/lib/auth"

import { requireCsrf } from "@/lib/require-csrf"
import { getRequestInfo } from "@/lib/request-info"
import { logAudit } from "@/lib/audit"


type Params = {
  params: Promise<{
    id: string
    sessionId: string
  }>
}


export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    // =========================
    // 1. CSRF
    // =========================

    requireCsrf(req)

    // =========================
    // 2. AUTHENTICATE ADMIN
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
    // 5. GET PARAMS
    // =========================

    const {
      id,
      sessionId,
    } = await params

    // =========================
    // 6. VALIDATE USER ID
    // =========================

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

    // =========================
    // 7. VALIDATE SESSION ID
    // =========================

    if (
      !sessionId ||
      sessionId.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid session ID",
        },
        {
          status: 400,
        }
      )
    }

    const userId =
      new ObjectId(id)

    // =========================
    // 8. DATABASE
    // =========================

    const db =
      await getDb()

    const users =
      db.collection("adminUser")

    const refreshTokens =
      db.collection(
        "refresh_tokens"
      )

    // =========================
    // 9. FIND TARGET USER
    // =========================

    const targetUser =
      await users.findOne({
        _id: userId,
      })

    if (!targetUser) {
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
    // 10. FIND ACTIVE SESSION
    // =========================

    const activeSession =
      await refreshTokens.findOne({
        userId,
        sessionId,
        revokedAt: null,
        expiresAt: {
          $gt: new Date(),
        },
      })

    if (!activeSession) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Active session not found",
        },
        {
          status: 404,
        }
      )
    }

    // =========================
    // 11. REVOKE SESSION
    // =========================

    const result =
      await refreshTokens.updateMany(
        {
          userId,
          sessionId,
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
    // 12. CHECK RESULT
    // =========================

    if (
      result.modifiedCount === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Session has already been terminated",
        },
        {
          status: 409,
        }
      )
    }

    // =========================
    // 13. AUDIT LOG
    // =========================

    await logAudit({
      // Admin who performed action
      userId: admin._id,

      action:
        "SESSION_TERMINATED",

      ip,

      userAgent,

      sessionId,

      metadata: {
        terminatedBy:
          admin._id?.toString(),

        targetUserId:
          userId.toString(),

        targetUserEmail:
          targetUser.email,

        targetUserName:
          targetUser.name,

        deviceId:
          activeSession.deviceId,

        deviceName:
          activeSession.deviceName ||
          null,

        revokedTokens:
          result.modifiedCount,

        terminationType:
          "admin",
      },
    })

    // =========================
    // 14. RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      message:
        "User session terminated successfully",

      session: {
        sessionId,

        deviceId:
          activeSession.deviceId,

        deviceName:
          activeSession.deviceName ||
          null,
      },

      revokedTokens:
        result.modifiedCount,
    })
  } catch (error) {
    console.error(
      "ADMIN SESSION TERMINATION ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to terminate session"

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
          "Failed to terminate session",
      },
      {
        status: 500,
      }
    )
  }
}