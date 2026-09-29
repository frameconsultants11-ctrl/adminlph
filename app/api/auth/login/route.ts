import {
  NextRequest,
  NextResponse,
} from "next/server"

import bcrypt from "bcryptjs"
import crypto from "crypto"

import { logAudit } from "@/lib/audit"

import {
  getRequestInfo,
} from "@/lib/request-info"

import {
  getClientIp,
} from "@/lib/request-ip"

import {
  checkLoginIpLimit,
  checkLoginAccountIpLimit,
} from "@/lib/login-protection"

import {
  getDb,
} from "@/lib/db"

import {
  RefreshTokenDocument,
} from "@/lib/types"

import {
  createAccessToken,
  createRefreshToken,
  hashToken,
} from "@/lib/token"

import {
  getUserCollection,
} from "@/models/user"

import {
  getLockoutDuration,
} from "@/lib/login-lockout"


export async function POST(
  req: NextRequest
) {
  try {
    // --------------------------------
    // REQUEST INFO
    // --------------------------------

    const ip =
      getClientIp(req)

    const { userAgent } =
      getRequestInfo(req)

    // --------------------------------
    // IP RATE LIMIT
    // --------------------------------
    //
    // This protects the whole IP from
    // login request bursts.
    //
    // 10 attempts / 15 minutes
    // --------------------------------

    const ipRateLimit =
      await checkLoginIpLimit(ip)

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,

          headers: {
            "Retry-After":
              ipRateLimit
                .retryAfterSeconds
                .toString(),
          },
        }
      )
    }

    // --------------------------------
    // READ BODY
    // --------------------------------

    const body =
      await req.json()

    const {
      email,
      password,
      deviceId,
      deviceName,
    }: {
      email: string
      password: string
      deviceId: string
      deviceName?: string
    } = body

    // --------------------------------
    // VALIDATION
    // --------------------------------

    if (
      !email ||
      !password ||
      !deviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email, password and device ID are required",
        },
        {
          status: 400,
        }
      )
    }

    const normalizedEmail =
      email
        .toLowerCase()
        .trim()

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const users =
      getUserCollection(db)

    // --------------------------------
    // FIND USER
    // --------------------------------

    const user =
      await users.findOne({
        email:
          normalizedEmail,
      })

    // --------------------------------
    // USER NOT FOUND
    // --------------------------------

    if (!user) {
      await logAudit({
        action:
          "LOGIN_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "USER_NOT_FOUND",
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password",
        },
        {
          status: 401,
        }
      )
    }

    // --------------------------------
    // ACCOUNT STATUS
    // --------------------------------

    if (!user.isActive) {
      await logAudit({
        userId:
          user._id,

        action:
          "LOGIN_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "ACCOUNT_INACTIVE",
        },
      })

      return NextResponse.json(
        {
          success: false,
          message:
            "Your account is inactive",
        },
        {
          status: 403,
        }
      )
    }

    // --------------------------------
    // CHECK ACCOUNT LOCK
    // --------------------------------

    const now =
      new Date()

    if (
      user.lockedUntil &&
      user.lockedUntil > now
    ) {
      await logAudit({
        userId:
          user._id,

        action:
          "LOGIN_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "ACCOUNT_LOCKED",

          lockedUntil:
            user.lockedUntil,
        },
      })

      return NextResponse.json(
        {
          success: false,

          message:
            "Your account is temporarily locked. Please try again later.",

          lockedUntil:
            user.lockedUntil,
        },
        {
          status: 423,

          headers: {
            "Retry-After":
              Math.ceil(
                (
                  user.lockedUntil.getTime() -
                  Date.now()
                ) / 1000
              ).toString(),
          },
        }
      )
    }

    // --------------------------------
    // CLEAR EXPIRED LOCK
    // --------------------------------

    if (
      user.lockedUntil &&
      user.lockedUntil <= now
    ) {
      await users.updateOne(
        {
          _id:
            user._id,
        },
        {
          $set: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },

          $unset: {
            lastFailedLoginAt: "",
          },
        }
      )

      user.failedLoginAttempts =
        0

      user.lockedUntil =
        null
    }

    // --------------------------------
    // PASSWORD CHECK
    // --------------------------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      )

    // --------------------------------
    // INVALID PASSWORD
    // --------------------------------

    if (!passwordMatch) {

      // --------------------------------
      // ACCOUNT + IP RATE LIMIT
      // --------------------------------
      //
      // IMPORTANT:
      // This is called ONLY after a
      // real password failure.
      //
      // 5 failures / 15 minutes
      // --------------------------------

      const accountIpRateLimit =
        await checkLoginAccountIpLimit(
          ip,
          normalizedEmail
        )

      // --------------------------------
      // ACCOUNT FAILURE COUNTER
      // --------------------------------

      const failedAttempts =
        (
          user.failedLoginAttempts ||
          0
        ) + 1

      const lockDuration =
        getLockoutDuration(
          failedAttempts
        )

      const lockedUntil =
        lockDuration > 0
          ? new Date(
              Date.now() +
                lockDuration
            )
          : null

      // --------------------------------
      // UPDATE USER
      // --------------------------------

      await users.updateOne(
        {
          _id:
            user._id,
        },
        {
          $set: {
            failedLoginAttempts:
              failedAttempts,

            lastFailedLoginAt:
              new Date(),

            lockedUntil,
          },
        }
      )

      // --------------------------------
      // AUDIT FAILURE
      // --------------------------------

      await logAudit({
        userId:
          user._id,

        action:
          "LOGIN_FAILED",

        ip,

        userAgent,

        metadata: {
          reason:
            "INVALID_PASSWORD",

          failedAttempts,

          accountIpAttempts:
            accountIpRateLimit.remaining ===
            0
              ? 5
              : 5 -
                accountIpRateLimit
                  .remaining,

          accountIpRemaining:
            accountIpRateLimit
              .remaining,

          accountIpRateLimited:
            !accountIpRateLimit.allowed,

          lockedUntil,
        },
      })

      // --------------------------------
      // ACCOUNT LOCKOUT
      // --------------------------------

      if (lockedUntil) {
        const retryAfter =
          Math.max(
            0,
            Math.ceil(
              (
                lockedUntil.getTime() -
                Date.now()
              ) / 1000
            )
          )

        return NextResponse.json(
          {
            success: false,

            message:
              "Too many failed login attempts. Your account has been temporarily locked.",

            lockedUntil,
          },
          {
            status: 423,

            headers: {
              "Retry-After":
                retryAfter.toString(),
            },
          }
        )
      }

      // --------------------------------
      // ACCOUNT + IP LOCKOUT
      // --------------------------------

      if (
        !accountIpRateLimit.allowed
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Too many failed login attempts. Please try again later.",

            retryAfterSeconds:
              accountIpRateLimit
                .retryAfterSeconds,
          },
          {
            status: 429,

            headers: {
              "Retry-After":
                accountIpRateLimit
                  .retryAfterSeconds
                  .toString(),
            },
          }
        )
      }

      // --------------------------------
      // NORMAL INVALID PASSWORD
      // --------------------------------

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid email or password",
        },
        {
          status: 401,
        }
      )
    }

    // --------------------------------
    // SUCCESSFUL PASSWORD
    // RESET ACCOUNT LOCKOUT
    // --------------------------------

    await users.updateOne(
      {
        _id:
          user._id,
      },
      {
        $set: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },

        $unset: {
          lastFailedLoginAt: "",
        },
      }
    )

    // --------------------------------
    // REFRESH TOKEN COLLECTION
    // --------------------------------

    const refreshTokens =
      db.collection<RefreshTokenDocument>(
        "refresh_tokens"
      )

    // --------------------------------
    // CHECK EXISTING DEVICE SESSION
    // --------------------------------

    const existingSession =
      await refreshTokens.findOne({
        userId:
          user._id!,

        deviceId,

        revokedAt: null,

        expiresAt: {
          $gt:
            new Date(),
        },
      })

    let sessionId: string

    // --------------------------------
    // EXISTING DEVICE
    // --------------------------------

    if (existingSession) {
      sessionId =
        existingSession.sessionId

      await refreshTokens.updateMany(
        {
          userId:
            user._id!,

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
    }

    // --------------------------------
    // NEW DEVICE
    // --------------------------------

    else {
      const activeSessions =
        await refreshTokens
          .aggregate([
            {
              $match: {
                userId:
                  user._id!,

                revokedAt: null,

                expiresAt: {
                  $gt:
                    new Date(),
                },
              },
            },

            {
              $group: {
                _id:
                  "$sessionId",
              },
            },
          ])
          .toArray()

      // --------------------------------
      // MAX 2 DEVICES
      // --------------------------------

      if (
        activeSessions.length >= 2
      ) {
        await logAudit({
          userId:
            user._id,

          action:
            "LOGIN_FAILED",

          ip,

          userAgent,

          metadata: {
            reason:
              "MAX_SESSIONS_REACHED",

            deviceId,

            deviceName:
              deviceName ||
              null,
          },
        })

        return NextResponse.json(
          {
            success: false,

            message:
              "Already logged in on 2 devices",
          },
          {
            status: 409,
          }
        )
      }

      sessionId =
        crypto.randomUUID()
    }

    // --------------------------------
    // DEVICE NAME
    // --------------------------------

    const finalDeviceName =
      deviceName?.trim() ||
      "Unknown device"

    // --------------------------------
    // CREATE ACCESS TOKEN
    // --------------------------------

    const accessToken =
      await createAccessToken(
        user._id!.toString(),
        user.role,
        sessionId
      )

    // --------------------------------
    // CREATE REFRESH TOKEN
    // --------------------------------

    const refreshToken =
      await createRefreshToken(
        user._id!.toString(),
        sessionId
      )

    // --------------------------------
    // STORE REFRESH TOKEN
    // --------------------------------

    const refreshTokenDocument:
      RefreshTokenDocument = {
      userId:
        user._id!,

      sessionId,

      tokenHash:
        hashToken(
          refreshToken
        ),

      deviceId,

      deviceName:
        finalDeviceName,

      expiresAt:
        new Date(
          Date.now() +
            30 *
              24 *
              60 *
              60 *
              1000
        ),

      revokedAt:
        null,

      createdAt:
        new Date(),

      lastUsedAt:
        new Date(),
    }

    await refreshTokens.insertOne(
      refreshTokenDocument
    )

    // --------------------------------
    // AUDIT SUCCESSFUL LOGIN
    // --------------------------------

    await logAudit({
      userId:
        user._id,

      action:
        "LOGIN",

      ip,

      userAgent,

      sessionId,

      metadata: {
        deviceId,

        deviceName:
          finalDeviceName,
      },
    })

    // --------------------------------
    // RESPONSE
    // --------------------------------

    const response =
      NextResponse.json({
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
        },

        session: {
          sessionId,

          deviceId,

          deviceName:
            finalDeviceName,
        },
      })

    // --------------------------------
    // ACCESS TOKEN COOKIE
    // --------------------------------

    response.cookies.set(
      "accessToken",
      accessToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path: "/",

        maxAge:
          15 * 60,
      }
    )

    // --------------------------------
    // REFRESH TOKEN COOKIE
    // --------------------------------

    response.cookies.set(
      "refreshToken",
      refreshToken,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

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
      "LOGIN ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,

        message:
          "Something went wrong",
      },
      {
        status: 500,
      }
    )
  }
}