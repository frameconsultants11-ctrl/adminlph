import {
  NextRequest,
  NextResponse,
} from "next/server"

import { authenticate } from "@/lib/auth"
import { getDb } from "@/lib/db"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import { logAudit } from "@/lib/audit"
import { getRequestInfo } from "@/lib/request-info"

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      sessionId: string
    }>
  }
) {
  try {
    // =========================
    // 1. CSRF PROTECTION
    // =========================

    requireCsrf(req)

    // =========================
    // 2. AUTHENTICATE USER
    // =========================

    const user =
      await authenticate(req)

    // =========================
    // 3. REQUEST INFO
    // =========================

    const { ip, userAgent } =
      getRequestInfo(req)

    // =========================
    // 4. GET SESSION ID
    // =========================

    const { sessionId } =
      await params

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Session ID is required",
        },
        { status: 400 }
      )
    }

    // =========================
    // 5. DATABASE
    // =========================

    const db = await getDb()

    const refreshTokens =
      db.collection(
        "refresh_tokens"
      )

    // =========================
    // 6. REVOKE SESSION
    // =========================

    const result =
      await refreshTokens.updateMany(
        {
          userId: user._id,
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
    // 7. SESSION NOT FOUND
    // =========================

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Session not found or already terminated",
        },
        { status: 404 }
      )
    }

    // =========================
    // 8. AUDIT LOG
    // =========================

    await logAudit({
      userId: user._id,

      action:
        "SESSION_TERMINATED",

      ip,

      userAgent,

      sessionId,

      metadata: {
        terminatedBy: "user",
        revokedTokens:
          result.modifiedCount,
      },
    })

    // =========================
    // 9. RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      message:
        "Session terminated successfully",
    })
  } catch (error) {
    console.error(
      "TERMINATE SESSION ERROR:",
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