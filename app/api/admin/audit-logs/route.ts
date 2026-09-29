import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import { authenticate, authorize } from "@/lib/auth"
import { getAuditCollection } from "@/models/audit"

export async function GET(req: NextRequest) {
  try {
    // --------------------------------
    // Authentication
    // --------------------------------

    const user = await authenticate(req)

    // --------------------------------
    // Admin only
    // --------------------------------

    authorize(user, "admin")

    // --------------------------------
    // Query params
    // --------------------------------

    const { searchParams } = new URL(req.url)

    const page = Math.max(
      Number(searchParams.get("page")) || 1,
      1
    )

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit")) || 20,
        1
      ),
      100
    )

    const action =
      searchParams.get("action")?.trim() || ""

    const userId =
      searchParams.get("userId")?.trim() || ""

    const search =
      searchParams.get("search")?.trim() || ""

    const ip =
      searchParams.get("ip")?.trim() || ""

    const sessionId =
      searchParams.get("sessionId")?.trim() || ""

    const from =
      searchParams.get("from")?.trim() || ""

    const to =
      searchParams.get("to")?.trim() || ""

    const skip = (page - 1) * limit

    // --------------------------------
    // Validate userId
    // --------------------------------

    if (userId && !ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid userId",
        },
        { status: 400 }
      )
    }

    // --------------------------------
    // Validate dates
    // --------------------------------

    let fromDate: Date | undefined
    let toDate: Date | undefined

    if (from) {
      fromDate = new Date(
        `${from}T00:00:00.000Z`
      )

      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid from date",
          },
          { status: 400 }
        )
      }
    }

    if (to) {
      toDate = new Date(
        `${to}T23:59:59.999Z`
      )

      if (Number.isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid to date",
          },
          { status: 400 }
        )
      }
    }

    // --------------------------------
    // Validate date range
    // --------------------------------

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "From date cannot be after to date",
        },
        { status: 400 }
      )
    }

    // --------------------------------
    // Database
    // --------------------------------

    const db = await getDb()

    const audits =
      getAuditCollection(db)

    // --------------------------------
    // Build filter
    // --------------------------------

    const filter: Record<string, unknown> = {}

    // --------------------------------
    // Filter by action
    // --------------------------------

    if (action) {
      filter.action = action
    }

    // --------------------------------
    // Filter by user
    // --------------------------------

    if (userId) {
      filter.userId = new ObjectId(userId)
    }

    // --------------------------------
    // Search IP / User Agent
    // --------------------------------

    if (search) {
      filter.$or = [
        {
          ip: {
            $regex: search,
            $options: "i",
          },
        },
        {
          userAgent: {
            $regex: search,
            $options: "i",
          },
        },
      ]
    }

    // --------------------------------
    // Exact IP
    // --------------------------------

    if (ip) {
      filter.ip = ip
    }

    // --------------------------------
    // Exact session ID
    // --------------------------------

    if (sessionId) {
      filter.sessionId = sessionId
    }

    // --------------------------------
    // Date range
    // --------------------------------

    if (fromDate || toDate) {
      const createdAt: Record<
        string,
        Date
      > = {}

      if (fromDate) {
        createdAt.$gte = fromDate
      }

      if (toDate) {
        createdAt.$lte = toDate
      }

      filter.createdAt = createdAt
    }

    // --------------------------------
    // Fetch logs + total
    // --------------------------------

    const [logs, total] =
      await Promise.all([
        audits
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),

        audits.countDocuments(filter),
      ])

    // --------------------------------
    // Get users
    // --------------------------------

    const userIds = logs
      .filter((log) => log.userId)
      .map((log) => log.userId!)

    const users =
      userIds.length > 0
        ? await db
            .collection("adminUser")
            .find(
              {
                _id: {
                  $in: userIds,
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

    // --------------------------------
    // User map
    // --------------------------------

    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        {
          name: u.name,
          email: u.email,
        },
      ])
    )

    // --------------------------------
    // Format logs
    // --------------------------------

    const formattedLogs = logs.map(
      (log) => {
        const account = log.userId
          ? userMap.get(
              log.userId.toString()
            )
          : undefined

        return {
          id: log._id?.toString(),

          action: log.action,

          user: log.userId
            ? {
                id: log.userId.toString(),
                name:
                  account?.name ||
                  "Unknown",
                email:
                  account?.email ||
                  "Unknown",
              }
            : null,

          ip: log.ip || null,

          userAgent:
            log.userAgent || null,

          sessionId:
            log.sessionId || null,

          metadata:
            log.metadata || null,

          createdAt: log.createdAt,
        }
      }
    )

    // --------------------------------
    // Response
    // --------------------------------

    return NextResponse.json({
      success: true,

      logs: formattedLogs,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),

        hasNextPage:
          page * limit < total,

        hasPreviousPage:
          page > 1,
      },
    })
  } catch (error) {
    console.error(
      "GET AUDIT LOGS ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch audit logs"

    // --------------------------------
    // Authentication errors
    // --------------------------------

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
        { status: 401 }
      )
    }

    // --------------------------------
    // Authorization
    // --------------------------------

    if (
      message ===
      "You do not have permission to access this resource"
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 403 }
      )
    }

    // --------------------------------
    // Server error
    // --------------------------------

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch audit logs",
      },
      { status: 500 }
    )
  }
}