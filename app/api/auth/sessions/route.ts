import {
  NextRequest,
  NextResponse,
} from "next/server"

import { authenticate } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(
  req: NextRequest
) {
  try {
    const user = await authenticate(req)

    const db = await getDb()

    const refreshTokens =
      db.collection("refresh_tokens")

    const sessions =
      await refreshTokens
        .aggregate([
          {
            $match: {
              userId: user._id,
              revokedAt: null,
              expiresAt: {
                $gt: new Date(),
              },
            },
          },
          {
            $sort: {
              lastUsedAt: -1,
            },
          },
          {
            $group: {
              _id: "$sessionId",
              deviceId: {
                $first: "$deviceId",
              },
              deviceName: {
                $first: "$deviceName",
              },
              createdAt: {
                $first: "$createdAt",
              },
              lastUsedAt: {
                $first: "$lastUsedAt",
              },
              expiresAt: {
                $first: "$expiresAt",
              },
            },
          },
        ])
        .toArray()

    return NextResponse.json({
      success: true,
      sessions: sessions.map(
        (session) => ({
          sessionId: session._id,
          deviceId: session.deviceId,
          deviceName:
            session.deviceName || null,
          createdAt:
            session.createdAt,
          lastUsedAt:
            session.lastUsedAt,
          expiresAt:
            session.expiresAt,
        })
      ),
    })
  } catch (error) {
    console.error(
      "GET SESSIONS ERROR:",
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