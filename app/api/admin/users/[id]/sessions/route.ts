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


type Params = {
  params: Promise<{
    id: string
  }>
}


export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    // =========================
    // 1. AUTHENTICATE
    // =========================

    const admin =
      await authenticate(req)

    // =========================
    // 2. ADMIN ONLY
    // =========================

    authorize(
      admin,
      "admin"
    )

    // =========================
    // 3. GET USER ID
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
    // 4. DATABASE
    // =========================

    const db =
      await getDb()

    // =========================
    // 5. CHECK USER
    // =========================

    const user =
      await db
        .collection("adminUser")
        .findOne(
          {
            _id: userId,
          },
          {
            projection: {
              password: 0,
            },
          }
        )

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
    // 6. GET ACTIVE SESSIONS
    // =========================

    const sessions =
      await db
        .collection(
          "refresh_tokens"
        )
        .aggregate([
          {
            $match: {
              userId,
              revokedAt: null,
              expiresAt: {
                $gt: new Date(),
              },
            },
          },
          {
            $sort: {
              lastUsedAt: -1,
              createdAt: -1,
            },
          },
          {
            $group: {
              _id: "$sessionId",

              deviceId: {
                $first:
                  "$deviceId",
              },

              deviceName: {
                $first:
                  "$deviceName",
              },

              createdAt: {
                $first:
                  "$createdAt",
              },

              lastUsedAt: {
                $first:
                  "$lastUsedAt",
              },

              expiresAt: {
                $first:
                  "$expiresAt",
              },
            },
          },
        ])
        .toArray()

    // =========================
    // 7. FORMAT SESSIONS
    // =========================

    const formattedSessions =
      sessions.map(
        (session) => ({
          sessionId:
            session._id,

          deviceId:
            session.deviceId,

          deviceName:
            session.deviceName ||
            null,

          createdAt:
            session.createdAt,

          lastUsedAt:
            session.lastUsedAt ||
            null,

          expiresAt:
            session.expiresAt,
        })
      )

    // =========================
    // 8. RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      user: {
        id:
          user._id.toString(),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        isActive:
          user.isActive,
      },

      sessions:
        formattedSessions,

      total:
        formattedSessions.length,
    })
  } catch (error) {
    console.error(
      "GET ADMIN USER SESSIONS ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch sessions"

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

    if (
      message ===
        "Authentication required" ||
      message ===
        "Token has been revoked" ||
      message ===
        "Session has been terminated"
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

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch sessions",
      },
      {
        status: 500,
      }
    )
  }
}