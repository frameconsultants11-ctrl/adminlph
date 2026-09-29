import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  getDb,
} from "@/lib/db"

import {
  getToolCollection,
} from "@/models/tool"

import {
  uploadToolImage,
  deleteToolImage,
} from "@/lib/tool-image"

import {
  logAudit,
} from "@/lib/audit"


// ============================================
// GET /api/admin/tools
// ============================================

export async function GET(
  req: NextRequest
) {
  try {
    // --------------------------------
    // AUTH
    // --------------------------------

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    // --------------------------------
    // QUERY
    // --------------------------------

    const {
      searchParams,
    } = new URL(req.url)

    const search =
      searchParams
        .get("search")
        ?.trim()

    const isActiveParam =
      searchParams.get(
        "isActive"
      )

    const pageParam =
      Number(
        searchParams.get(
          "page"
        ) || 1
      )

    const limitParam =
      Number(
        searchParams.get(
          "limit"
        ) || 20
      )

    const page =
      Number.isFinite(
        pageParam
      )
        ? Math.max(
            1,
            pageParam
          )
        : 1

    const limit =
      Number.isFinite(
        limitParam
      )
        ? Math.min(
            100,
            Math.max(
              1,
              limitParam
            )
          )
        : 20

    const skip =
      (page - 1) *
      limit

    // --------------------------------
    // FILTER
    // --------------------------------

    const filter: {
      name?: {
        $regex: string
        $options: string
      }

      isActive?: boolean
    } = {}

    if (search) {
      filter.name = {
        $regex: search,
        $options: "i",
      }
    }

    if (
      isActiveParam === "true" ||
      isActiveParam === "false"
    ) {
      filter.isActive =
        isActiveParam ===
        "true"
    }

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const tools =
      getToolCollection(db)

    const [
      items,
      total,
    ] = await Promise.all([
      tools
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      tools.countDocuments(
        filter
      ),
    ])

    // --------------------------------
    // RESPONSE
    // --------------------------------

    return NextResponse.json({
      success: true,

      data: items,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    })
  } catch (error) {
    console.error(
      "GET TOOLS ERROR:",
      error
    )

    if (
      error instanceof Error &&
      (
        error.message ===
          "Authentication required" ||
        error.message ===
          "Invalid access token"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication required",
        },
        {
          status: 401,
        }
      )
    }

    if (
      error instanceof Error &&
      error.message.includes(
        "permission"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
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
          "Unable to fetch tools",
      },
      {
        status: 500,
      }
    )
  }
}


// ============================================
// POST /api/admin/tools
// ============================================

export async function POST(
  req: NextRequest
) {
  let uploadedImageUrl:
    | string
    | undefined

  try {
    // --------------------------------
    // CSRF
    // --------------------------------

    requireCsrf(req)

    // --------------------------------
    // AUTH
    // --------------------------------

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    // --------------------------------
    // FORM DATA
    // --------------------------------

    const formData =
      await req.formData()

    const name =
      String(
        formData.get(
          "name"
        ) || ""
      ).trim()

    const isActiveValue =
      formData.get(
        "isActive"
      )

    const image =
      formData.get(
        "image"
      )

    // --------------------------------
    // VALIDATE NAME
    // --------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool name is required",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------
    // VALIDATE IMAGE
    // --------------------------------

    if (
      !image ||
      !(image instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool image is required",
        },
        {
          status: 400,
        }
      )
    }

    if (image.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool image cannot be empty",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------
    // VALIDATE ACTIVE STATUS
    // --------------------------------

    let isActive = true

    if (
      isActiveValue !== null
    ) {
      if (
        isActiveValue !== "true" &&
        isActiveValue !== "false"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "isActive must be true or false",
          },
          {
            status: 400,
          }
        )
      }

      isActive =
        isActiveValue ===
        "true"
    }

    // --------------------------------
    // UPLOAD IMAGE
    // --------------------------------

    const uploaded =
      await uploadToolImage(
        image
      )

    uploadedImageUrl =
      uploaded.url

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const tools =
      getToolCollection(db)

    const now =
      new Date()

    const result =
      await tools.insertOne({
        name,

        image:
          uploaded.url,

        isActive,

        createdAt:
          now,

        updatedAt:
          now,
      })

    // --------------------------------
    // AUDIT
    // --------------------------------

    await logAudit({
      userId:
        user._id,

      action:
        "TOOL_CREATED",

      metadata: {
        resource:
          "tool",

        toolId:
          result.insertedId.toString(),

        name,

        isActive,
      },
    })

    // --------------------------------
    // RESPONSE
    // --------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Tool created successfully",

        data: {
          _id:
            result.insertedId,

          name,

          image:
            uploaded.url,

          isActive,

          createdAt:
            now,

          updatedAt:
            now,
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "CREATE TOOL ERROR:",
      error
    )

    // --------------------------------
    // CLEAN UP ORPHANED BLOB
    // --------------------------------

    if (
      uploadedImageUrl
    ) {
      await deleteToolImage(
        uploadedImageUrl
      )
    }

    // --------------------------------
    // CSRF ERROR
    // --------------------------------

    if (
      error instanceof Error &&
      error.message ===
        "Invalid CSRF token"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid CSRF token",
        },
        {
          status: 403,
        }
      )
    }

    // --------------------------------
    // IMAGE ERROR
    // --------------------------------

    if (
      error instanceof Error &&
      (
        error.message.includes(
          "Only JPG"
        ) ||
        error.message.includes(
          "Image size"
        )
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------
    // PERMISSION ERROR
    // --------------------------------

    if (
      error instanceof Error &&
      error.message.includes(
        "permission"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        {
          status: 403,
        }
      )
    }

    // --------------------------------
    // GENERIC ERROR
    // --------------------------------

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create tool",
      },
      {
        status: 500,
      }
    )
  }
}