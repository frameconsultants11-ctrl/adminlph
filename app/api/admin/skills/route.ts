// app/api/admin/skills/route.ts

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
  getSkillCollection,
} from "@/lib/skill"

import {
  uploadSkillImage,
  deleteSkillImage,
} from "@/lib/skill-image"

import {
  logAudit,
} from "@/lib/audit"


// ==========================================
// GET
// /api/admin/skills
// ==========================================

export async function GET(
  req: NextRequest
) {

  try {

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )


    const {
      searchParams,
    } = new URL(
      req.url
    )


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
        ) || 10
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
        : 10


    const skip =
      (page - 1) *
      limit


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
      isActiveParam ===
        "true" ||
      isActiveParam ===
        "false"
    ) {

      filter.isActive =
        isActiveParam ===
        "true"

    }


    const db =
      await getDb()


    const skills =
      getSkillCollection(
        db
      )


    const [
      items,
      total,
    ] =
      await Promise.all([
        skills
          .find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .toArray(),

        skills.countDocuments(
          filter
        ),
      ])


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
      "GET SKILLS ERROR:",
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
          "Unable to fetch skills",
      },
      {
        status: 500,
      }
    )
  }
}


// ==========================================
// POST
// /api/admin/skills
// ==========================================

export async function POST(
  req: NextRequest
) {

  let uploadedImageUrl:
    | string
    | undefined


  try {

    requireCsrf(req)


    const user =
      await authenticate(req)


    authorize(
      user,
      "admin"
    )


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


    // ======================================
    // NAME
    // ======================================

    if (!name) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Skill name is required",
        },
        {
          status: 400,
        }
      )
    }


    // ======================================
    // IMAGE
    // ======================================

    if (
      !image ||
      !(image instanceof File)
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Skill image is required",
        },
        {
          status: 400,
        }
      )
    }


    if (
      image.size === 0
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Skill image cannot be empty",
        },
        {
          status: 400,
        }
      )
    }


    // ======================================
    // ACTIVE
    // ======================================

    let isActive = true


    if (
      isActiveValue !== null
    ) {

      if (
        isActiveValue !==
          "true" &&
        isActiveValue !==
          "false"
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


    // ======================================
    // UPLOAD IMAGE
    // ======================================

    const uploaded =
      await uploadSkillImage(
        image
      )


    uploadedImageUrl =
      uploaded.url


    // ======================================
    // DATABASE
    // ======================================

    const db =
      await getDb()


    const skills =
      getSkillCollection(
        db
      )


    const now =
      new Date()


    const result =
      await skills.insertOne({
        name,

        image:
          uploaded.url,

        isActive,

        createdAt:
          now,

        updatedAt:
          now,
      })


    // ======================================
    // AUDIT
    // ======================================

    await logAudit({
      userId:
        user._id,

      action:
        "SKILL_CREATED",

      metadata: {
        resource:
          "skill",

        skillId:
          result.insertedId.toString(),

        name,

        isActive,
      },
    })


    return NextResponse.json(
      {
        success: true,

        message:
          "Skill created successfully",

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
      "CREATE SKILL ERROR:",
      error
    )


    if (
      uploadedImageUrl
    ) {

      await deleteSkillImage(
        uploadedImageUrl
      )

    }


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
          error instanceof Error
            ? error.message
            : "Unable to create skill",
      },
      {
        status: 500,
      }
    )
  }
}