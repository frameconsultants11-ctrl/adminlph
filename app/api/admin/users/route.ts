import {
  NextRequest,
  NextResponse,
} from "next/server"

import bcrypt from "bcryptjs"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import { getDb } from "@/lib/db"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  validatePassword,
} from "@/lib/password"

import {
  logAudit,
} from "@/lib/audit"

import {
  getRequestInfo,
} from "@/lib/request-info"

import {
  UserRole,
} from "@/lib/types"

// ======================================================
// GET - LIST USERS
// ======================================================

export async function GET(
  req: NextRequest
) {
  try {

    const admin =
      await authenticate(req)

    authorize(
      admin,
      "admin"
    )

    const { searchParams } =
      new URL(req.url)

    const page = Math.max(
      Number(
        searchParams.get("page") ||
          "1"
      ),
      1
    )

    const limit = Math.min(
      Math.max(
        Number(
          searchParams.get("limit") ||
            "20"
        ),
        1
      ),
      100
    )

    const search =
      searchParams
        .get("search")
        ?.trim() || ""

    const role =
      searchParams.get("role")

    const isActiveParam =
      searchParams.get("isActive")

    const db = await getDb()

    const users =
      db.collection(
        "adminUser"
      )

    const filter: Record<
      string,
      unknown
    > = {}

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ]
    }

    if (
      role &&
      [
        "admin",
        "manager",
        "staff",
      ].includes(role)
    ) {
      filter.role = role
    }

    if (
      isActiveParam === "true"
    ) {
      filter.isActive = true
    }

    if (
      isActiveParam === "false"
    ) {
      filter.isActive = false
    }

    const skip =
      (page - 1) * limit


    const [userList, total] =
      await Promise.all([
        users
          .find(filter, {
            projection: {
              password: 0,
            },
          })
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .toArray(),

        users.countDocuments(
          filter
        ),
      ])

    const totalPages =
      Math.ceil(
        total / limit
      )


    return NextResponse.json({
      success: true,

      users: userList.map(
        (user) => ({
          id: user._id!.toString(),

          name: user.name,

          email: user.email,

          role: user.role,

          isActive:
            user.isActive,

          createdAt:
            user.createdAt,
        })
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    })
  } catch (error) {
    console.error(
      "GET ADMIN USERS ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized"

    const status =
      message.includes(
        "permission"
      )
        ? 403
        : 401

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    )
  }
}

// ======================================================
// POST - CREATE USER
// ======================================================

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

    const { ip, userAgent } =
      getRequestInfo(req)

    // =========================
    // 5. READ BODY
    // =========================

    const body = await req.json()

    const {
      name,
      email,
      password,
      role,
    }: {
      name?: string
      email?: string
      password?: string
      role?: UserRole
    } = body

    // =========================
    // 6. BASIC VALIDATION
    // =========================

    if (
      !name ||
      !email ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name, email, password and role are required",
        },
        { status: 400 }
      )
    }

    const normalizedName =
      name.trim()

    const normalizedEmail =
      email
        .toLowerCase()
        .trim()

    if (
      !normalizedName ||
      !normalizedEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Name and email are required",
        },
        { status: 400 }
      )
    }

    // =========================
    // 7. VALIDATE ROLE
    // =========================

    const allowedRoles:
      UserRole[] = [
      "admin",
      "manager",
      "staff",
    ]

    if (
      !allowedRoles.includes(
        role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid user role",
        },
        { status: 400 }
      )
    }

    // =========================
    // 8. VALIDATE PASSWORD
    // =========================

    const passwordValidation =
      validatePassword(
        password
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
        { status: 400 }
      )
    }

    // =========================
    // 9. DATABASE
    // =========================

    const db = await getDb()

    const users =
      db.collection(
        "adminUser"
      )

    // =========================
    // 10. CHECK DUPLICATE EMAIL
    // =========================

    const existingUser =
      await users.findOne({
        email: normalizedEmail,
      })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User with this email already exists",
        },
        { status: 409 }
      )
    }

    // =========================
    // 11. HASH PASSWORD
    // =========================

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      )

    // =========================
    // 12. CREATE USER
    // =========================

    const newUser = {
      name: normalizedName,

      email: normalizedEmail,

      password:
        hashedPassword,

      role,

      isActive: true,

      createdAt:
        new Date(),
    }

    const result =
      await users.insertOne(
        newUser
      )

    // =========================
    // 13. AUDIT
    // =========================

    await logAudit({
      userId:
        result.insertedId,

      action:
        "USER_CREATED",

      ip,

      userAgent,

      metadata: {
        createdBy:
          admin._id?.toString(),

        role,

        email:
          normalizedEmail,
      },
    })

    // =========================
    // 14. RESPONSE
    // =========================

    return NextResponse.json(
      {
        success: true,

        message:
          "User created successfully",

        user: {
          id:
            result.insertedId.toString(),

          name:
            normalizedName,

          email:
            normalizedEmail,

          role,

          isActive: true,

          createdAt:
            newUser.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "CREATE USER ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create user",
      },
      { status: 500 }
    )
  }
}