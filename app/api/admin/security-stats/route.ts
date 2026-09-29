import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import { authenticate, authorize } from "@/lib/auth"
import { getAuditCollection } from "@/models/audit"

const DAY = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req)

    authorize(user, "admin")

    const { searchParams } = new URL(req.url)

    const requestedDays =
      Number(searchParams.get("days")) || 7

    const days = Math.min(
      Math.max(requestedDays, 1),
      30
    )

    const db = await getDb()

    const audits =
      getAuditCollection(db)

    const now = new Date()

    const periodStart = new Date(
      now.getTime() -
        days * DAY
    )

    /*
     * ------------------------------------------------
     * COUNTS
     * ------------------------------------------------
     */

    const [
      loginSuccess,
      loginFailures,
      passwordChanges,
      tokenRefreshes,
      activeSessions,
      lockedAccounts,
    ] = await Promise.all([
      audits.countDocuments({
        action: "LOGIN",
        createdAt: {
          $gte: periodStart,
        },
      }),

      audits.countDocuments({
        action: "LOGIN_FAILED",
        createdAt: {
          $gte: periodStart,
        },
      }),

      audits.countDocuments({
        action: {
          $in: [
            "PASSWORD_CHANGED",
            "PASSWORD_RESET",
          ],
        },
        createdAt: {
          $gte: periodStart,
        },
      }),

      audits.countDocuments({
        action: "TOKEN_REFRESH",
        createdAt: {
          $gte: periodStart,
        },
      }),

      /*
       * One active session = one unique sessionId.
       *
       * We only count refresh tokens that:
       * - haven't been revoked
       * - haven't expired
       */
      db
        .collection("refresh_tokens")
        .aggregate([
          {
            $match: {
              revokedAt: null,
              expiresAt: {
                $gt: now,
              },
            },
          },
          {
            $group: {
              _id: "$sessionId",
            },
          },
          {
            $count: "total",
          },
        ])
        .toArray(),

      db
        .collection("adminUser")
        .countDocuments({
          isActive: true,
          lockedUntil: {
            $gt: now,
          },
        }),
    ])

    /*
     * ------------------------------------------------
     * ACTIVE SESSION COUNT
     * ------------------------------------------------
     */

    const activeSessionCount =
      activeSessions[0]?.total || 0

    /*
     * ------------------------------------------------
     * DAILY ACTIVITY
     * ------------------------------------------------
     */

    const activity =
      await audits
        .aggregate([
          {
            $match: {
              createdAt: {
                $gte: periodStart,
              },
              action: {
                $in: [
                  "LOGIN",
                  "LOGIN_FAILED",
                  "LOGOUT",
                ],
              },
            },
          },

          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                    timezone: "Asia/Kolkata",
                  },
                },

                action: "$action",
              },

              count: {
                $sum: 1,
              },
            },
          },

          {
            $sort: {
              "_id.date": 1,
            },
          },
        ])
        .toArray()

    /*
     * ------------------------------------------------
     * NORMALIZE DAILY ACTIVITY
     * ------------------------------------------------
     */

    const activityMap =
      new Map<
        string,
        {
          date: string
          login: number
          loginFailed: number
          logout: number
        }
      >()

    /*
     * Create all dates first so dates with
     * zero activity still appear.
     */

    for (
      let i = days - 1;
      i >= 0;
      i--
    ) {
      const date = new Date(
        now.getTime() -
          i * DAY
      )

      const dateString =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "Asia/Kolkata",
          }
        ).format(date)

      activityMap.set(
        dateString,
        {
          date: dateString,
          login: 0,
          loginFailed: 0,
          logout: 0,
        }
      )
    }

    for (const item of activity) {
      const date =
        item._id.date

      const existing =
        activityMap.get(date)

      if (!existing) {
        continue
      }

      if (
        item._id.action ===
        "LOGIN"
      ) {
        existing.login =
          item.count
      }

      if (
        item._id.action ===
        "LOGIN_FAILED"
      ) {
        existing.loginFailed =
          item.count
      }

      if (
        item._id.action ===
        "LOGOUT"
      ) {
        existing.logout =
          item.count
      }
    }

    /*
     * ------------------------------------------------
     * RECENT SECURITY EVENTS
     * ------------------------------------------------
     */

    const recentEvents =
      await audits
        .find({
          action: {
            $in: [
              "LOGIN_FAILED",
              "SESSION_TERMINATED",
              "PASSWORD_CHANGED",
              "PASSWORD_RESET",
              "ACCOUNT_DISABLED",
              "ACCOUNT_ENABLED",
              "USER_CREATED",
              "USER_DELETED",
            ],
          },
        })
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .toArray()

    /*
     * ------------------------------------------------
     * USER LOOKUP
     * ------------------------------------------------
     */

    const recentUserIds =
      recentEvents
        .filter(
          (event) =>
            event.userId
        )
        .map(
          (event) =>
            event.userId!
        )

    const uniqueUserIds = [
      ...new Map(
        recentUserIds.map(
          (id) => [
            id.toString(),
            id,
          ]
        )
      ).values(),
    ]

    const recentUsers =
      uniqueUserIds.length
        ? await db
            .collection("adminUser")
            .find(
              {
                _id: {
                  $in:
                    uniqueUserIds,
                },
              },
              {
                projection: {
                  name: 1,
                  email: 1,
                },
              }
            )
            .toArray()
        : []

    const userMap =
      new Map(
        recentUsers.map(
          (item) => [
            item._id.toString(),
            {
              name: item.name,
              email: item.email,
            },
          ]
        )
      )

    /*
     * ------------------------------------------------
     * FORMAT RECENT EVENTS
     * ------------------------------------------------
     */

    const formattedRecentEvents =
      recentEvents.map(
        (event) => {
          const account =
            event.userId
              ? userMap.get(
                  event.userId.toString()
                )
              : undefined

          return {
            id: event._id?.toString(),

            action:
              event.action,

            user:
              event.userId
                ? {
                    id: event.userId.toString(),
                    name:
                      account?.name ||
                      "Unknown",
                    email:
                      account?.email ||
                      "Unknown",
                  }
                : null,

            ip:
              event.ip ||
              null,

            sessionId:
              event.sessionId ||
              null,

            metadata:
              event.metadata ||
              null,

            createdAt:
              event.createdAt,
          }
        }
      )

    return NextResponse.json({
      success: true,

      period: {
        days,
        from: periodStart,
        to: now,
      },

      stats: {
        loginSuccess,
        loginFailures,
        activeSessions:
          activeSessionCount,
        lockedAccounts,
        passwordChanges,
        tokenRefreshes,
      },

      activity:
        Array.from(
          activityMap.values()
        ),

      recentEvents:
        formattedRecentEvents,
    })
  } catch (error) {
    console.error(
      "SECURITY STATS ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch security statistics"

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

    if (
      message ===
      "You do not have permission to access this resource"
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

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch security statistics",
      },
      {
        status: 500,
      }
    )
  }
}