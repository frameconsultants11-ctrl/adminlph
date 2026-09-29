import {
  NextRequest,
  NextResponse,
} from "next/server"

import { ObjectId } from "mongodb"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import { getDb } from "@/lib/db"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  UserRole,
} from "@/lib/types"

import {
  logAudit,
} from "@/lib/audit"

import {
  getRequestInfo,
} from "@/lib/request-info"

import {
  getUserCollection,
} from "@/models/user"

type Params = {
  params: Promise<{
    id: string
  }>
}

/* =========================================================
   PATCH
   Edit user
========================================================= */

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    // =====================================================
    // 1. CSRF
    // =====================================================

    requireCsrf(req)

    // =====================================================
    // 2. AUTHENTICATE
    // =====================================================

    const admin =
      await authenticate(req)

    // =====================================================
    // 3. ADMIN ONLY
    // =====================================================

    authorize(
      admin,
      "admin"
    )

    // =====================================================
    // 4. REQUEST INFO
    // =====================================================

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // =====================================================
    // 5. GET USER ID
    // =====================================================

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

    // =====================================================
    // 6. READ BODY
    // =====================================================

    const body =
      await req.json()

    const {
      name,
      email,
      role,
      isActive,
    }: {
      name?: string
      email?: string
      role?: UserRole
      isActive?: boolean
    } = body

    // =====================================================
    // 7. CHECK NOTHING TO UPDATE
    // =====================================================

    if (
      name === undefined &&
      email === undefined &&
      role === undefined &&
      isActive === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nothing to update",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 8. VALIDATE NAME
    // =====================================================

    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        !name.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name cannot be empty",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 9. VALIDATE EMAIL
    // =====================================================

    const normalizedEmail =
      typeof email === "string"
        ? email
            .trim()
            .toLowerCase()
        : undefined

    if (
      email !== undefined &&
      (
        typeof email !== "string" ||
        !normalizedEmail
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email cannot be empty",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 10. VALIDATE ROLE
    // =====================================================

    const allowedRoles:
      UserRole[] = [
        "admin",
        "manager",
        "staff",
      ]

    if (
      role !== undefined &&
      !allowedRoles.includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid role",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 11. VALIDATE STATUS
    // =====================================================

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "isActive must be a boolean",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 12. DATABASE
    // =====================================================

    const db =
      await getDb()

    const users =
      getUserCollection(db)

    // =====================================================
    // 13. FIND TARGET USER
    // =====================================================

    const existingUser =
      await users.findOne({
        _id: userId,
      })

    if (!existingUser) {
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

    // =====================================================
    // 14. PREVENT SELF DEACTIVATION
    // =====================================================

    if (
      isActive === false &&
      admin._id?.equals(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot deactivate your own account",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 15. CHECK DUPLICATE EMAIL
    // =====================================================

    if (
      normalizedEmail !== undefined &&
      normalizedEmail !==
        existingUser.email
    ) {
      const duplicate =
        await users.findOne({
          email: normalizedEmail,
          _id: {
            $ne: userId,
          },
        })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Email is already in use",
          },
          {
            status: 409,
          }
        )
      }
    }

    // =====================================================
    // 16. BUILD UPDATE
    // =====================================================

    const update: {
      name?: string
      email?: string
      role?: UserRole
      isActive?: boolean
    } = {}

    if (name !== undefined) {
      update.name =
        name.trim()
    }

    if (
      normalizedEmail !==
      undefined
    ) {
      update.email =
        normalizedEmail
    }

    if (role !== undefined) {
      update.role = role
    }

    if (isActive !== undefined) {
      update.isActive =
        isActive
    }

    // =====================================================
    // 17. DETERMINE STATUS CHANGE
    // =====================================================

    const isDeactivating =
      isActive === false &&
      existingUser.isActive === true

    const isReactivating =
      isActive === true &&
      existingUser.isActive === false

    // =====================================================
    // 18. UPDATE USER
    // =====================================================

    const result =
      await users.updateOne(
        {
          _id: userId,
        },
        {
          $set: update,
        }
      )

    // =====================================================
    // 19. REVOKE SESSIONS
    // =====================================================

    let sessionsRevoked = 0

    if (isDeactivating) {
      const sessionResult =
        await db
          .collection(
            "refresh_tokens"
          )
          .updateMany(
            {
              userId,
              $or: [
                {
                  revokedAt: null,
                },
                {
                  revokedAt: {
                    $exists: false,
                  },
                },
              ],
            },
            {
              $set: {
                revokedAt:
                  new Date(),
              },
            }
          )

      sessionsRevoked =
        sessionResult.modifiedCount
    }

    // =====================================================
    // 20. NO ACTUAL CHANGES
    // =====================================================

    if (
      result.modifiedCount === 0 &&
      sessionsRevoked === 0
    ) {
      return NextResponse.json({
        success: true,
        message:
          "No changes were made",
      })
    }

    // =====================================================
    // 21. AUDIT ACTION
    // =====================================================

    let auditAction:
      | "USER_UPDATED"
      | "USER_DEACTIVATED"
      | "USER_REACTIVATED" =
      "USER_UPDATED"

    if (isDeactivating) {
      auditAction =
        "USER_DEACTIVATED"
    }

    if (isReactivating) {
      auditAction =
        "USER_REACTIVATED"
    }

    // =====================================================
    // 22. AUDIT LOG
    // =====================================================

    await logAudit({
      userId: admin._id,
      action: auditAction,
      ip,
      userAgent,
      metadata: {
        targetUserId:
          userId.toString(),

        targetUserEmail:
          existingUser.email,

        targetUserName:
          existingUser.name,

        updatedBy:
          admin._id?.toString(),

        changes: update,

        sessionsRevoked,
      },
    })

    // =====================================================
    // 23. GET UPDATED USER
    // =====================================================

    const updatedUser =
      await users.findOne({
        _id: userId,
      })

    // =====================================================
    // 24. RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        isDeactivating
          ? "User deactivated successfully"
          : isReactivating
            ? "User reactivated successfully"
            : "User updated successfully",

      user: updatedUser
        ? {
            id:
              updatedUser._id!.toString(),

            name:
              updatedUser.name,

            email:
              updatedUser.email,

            role:
              updatedUser.role,

            isActive:
              updatedUser.isActive,

            createdAt:
              updatedUser.createdAt,
          }
        : null,

      sessionsRevoked,
    })
  } catch (error) {
    console.error(
      "UPDATE ADMIN USER ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized"

    // =====================================================
    // CSRF
    // =====================================================

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

    // =====================================================
    // AUTHORIZATION
    // =====================================================

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

    // =====================================================
    // AUTHENTICATION
    // =====================================================

    if (
      message ===
        "Authentication required" ||
      message ===
        "Token has been revoked" ||
      message ===
        "Session has been terminated" ||
      message ===
        "User not found" ||
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

    // =====================================================
    // DEFAULT
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update user",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================================================
   GET
   User details + active sessions
========================================================= */

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    // =====================================================
    // 1. AUTHENTICATE
    // =====================================================

    const admin =
      await authenticate(req)

    // =====================================================
    // 2. ADMIN ONLY
    // =====================================================

    authorize(
      admin,
      "admin"
    )

    // =====================================================
    // 3. GET USER ID
    // =====================================================

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

    // =====================================================
    // 4. DATABASE
    // =====================================================

    const db =
      await getDb()

    const users =
      db.collection(
        "adminUser"
      )

    // =====================================================
    // 5. FIND USER
    // =====================================================

    const user =
      await users.findOne(
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

    // =====================================================
    // 6. GET ACTIVE SESSIONS
    // =====================================================

    /*
     * Each refresh creates a new refresh-token document,
     * but the same session keeps the same sessionId.
     *
     * Therefore:
     *
     * refresh_tokens
     *       ↓
     * group by sessionId
     *       ↓
     * one device/session
     */

    const sessions =
      await db
        .collection(
          "refresh_tokens"
        )
        .aggregate([
          // -------------------------------------------------
          // Find active refresh tokens
          // -------------------------------------------------

          {
            $match: {
              userId,

              /*
               * Support both:
               *
               * revokedAt: null
               *
               * and older documents where revokedAt
               * wasn't stored.
               */
              $or: [
                {
                  revokedAt: null,
                },
                {
                  revokedAt: {
                    $exists: false,
                  },
                },
              ],

              expiresAt: {
                $gt: new Date(),
              },
            },
          },

          // -------------------------------------------------
          // Latest token first
          // -------------------------------------------------

          {
            $sort: {
              lastUsedAt: -1,
              createdAt: -1,
            },
          },

          // -------------------------------------------------
          // One document per session
          // -------------------------------------------------

          {
            $group: {
              _id: "$sessionId",

              sessionId: {
                $first:
                  "$sessionId",
              },

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

          // -------------------------------------------------
          // Newest session first
          // -------------------------------------------------

          {
            $sort: {
              createdAt: -1,
            },
          },
        ])
        .toArray()

    // =====================================================
    // 7. RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      user: {
        id:
          user._id!.toString(),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        isActive:
          user.isActive,

        createdAt:
          user.createdAt,

        failedLoginAttempts:
          user.failedLoginAttempts ||
          0,

        lockedUntil:
          user.lockedUntil ||
          null,
      },

      sessions:
        sessions.map(
          (session) => ({
            sessionId:
              session.sessionId ||
              session._id,

            deviceId:
              session.deviceId ||
              "unknown",

            deviceName:
              session.deviceName ||
              "Unknown device",

            createdAt:
              session.createdAt,

            lastUsedAt:
              session.lastUsedAt ||
              null,

            expiresAt:
              session.expiresAt,
          })
        ),
    })
  } catch (error) {
    console.error(
      "GET ADMIN USER ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized"

    // =====================================================
    // AUTHORIZATION
    // =====================================================

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

    // =====================================================
    // AUTHENTICATION
    // =====================================================

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
}

/* =========================================================
   DELETE
   Soft deactivate user
========================================================= */

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    // =====================================================
    // 1. CSRF
    // =====================================================

    requireCsrf(req)

    // =====================================================
    // 2. AUTHENTICATE
    // =====================================================

    const admin =
      await authenticate(req)

    // =====================================================
    // 3. ADMIN ONLY
    // =====================================================

    authorize(
      admin,
      "admin"
    )

    // =====================================================
    // 4. REQUEST INFO
    // =====================================================

    const {
      ip,
      userAgent,
    } = getRequestInfo(req)

    // =====================================================
    // 5. GET USER ID
    // =====================================================

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

    // =====================================================
    // 6. PREVENT SELF DEACTIVATION
    // =====================================================

    if (
      admin._id?.equals(userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You cannot deactivate your own account",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 7. DATABASE
    // =====================================================

    const db =
      await getDb()

    const users =
      getUserCollection(db)

    // =====================================================
    // 8. FIND TARGET USER
    // =====================================================

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

    // =====================================================
    // 9. CHECK ALREADY INACTIVE
    // =====================================================

    if (!targetUser.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User is already inactive",
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 10. DEACTIVATE USER
    // =====================================================

    await users.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          isActive: false,
        },
      }
    )

    // =====================================================
    // 11. REVOKE ALL ACTIVE SESSIONS
    // =====================================================

    const sessionResult =
      await db
        .collection(
          "refresh_tokens"
        )
        .updateMany(
          {
            userId,

            $or: [
              {
                revokedAt: null,
              },
              {
                revokedAt: {
                  $exists: false,
                },
              },
            ],
          },
          {
            $set: {
              revokedAt:
                new Date(),
            },
          }
        )

    // =====================================================
    // 12. AUDIT
    // =====================================================

    await logAudit({
      userId:
        admin._id,

      action:
        "USER_DEACTIVATED",

      ip,

      userAgent,

      metadata: {
        targetUserId:
          userId.toString(),

        targetUserEmail:
          targetUser.email,

        targetUserName:
          targetUser.name,

        previousStatus:
          true,

        newStatus:
          false,

        sessionsRevoked:
          sessionResult.modifiedCount,

        deletedBy:
          "admin",

        deletionType:
          "soft_delete",
      },
    })

    // =====================================================
    // 13. RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        "User deactivated successfully",

      sessionsRevoked:
        sessionResult.modifiedCount,
    })
  } catch (error) {
    console.error(
      "DELETE ADMIN USER ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to deactivate user"

    // =====================================================
    // AUTHENTICATION
    // =====================================================

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

    // =====================================================
    // AUTHORIZATION
    // =====================================================

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

    // =====================================================
    // CSRF
    // =====================================================

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

    // =====================================================
    // DEFAULT
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to deactivate user",
      },
      {
        status: 500,
      }
    )
  }
}