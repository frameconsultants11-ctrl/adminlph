import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  ObjectId,
} from "mongodb"

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
  getCourseCollection,
} from "@/models/course"

import {
  logAudit,
} from "@/lib/audit"

import {
  calculateActualPrice,
  validateEditorJs,
  validateHours,
  COURSE_LEVELS,
  DISCOUNT_TYPES,
} from "@/lib/course-validation"

/* =========================================================
   CONFIG
========================================================= */

const SEO_TITLE_MAX_LENGTH = 60

const SEO_DESCRIPTION_MAX_LENGTH = 160

const MAX_LIMIT = 100

/* =========================================================
   TYPES
========================================================= */

type DiscountType =
  | "percentage"
  | "amount"

/* =========================================================
   SEO VALIDATION
========================================================= */

function validateSeo(
  seoTitle: string,
  seoDescription: string
) {
  if (!seoTitle) {
    throw new Error(
      "SEO title is required"
    )
  }

  if (!seoDescription) {
    throw new Error(
      "SEO description is required"
    )
  }

  if (
    seoTitle.length >
    SEO_TITLE_MAX_LENGTH
  ) {
    throw new Error(
      `SEO title cannot exceed ${SEO_TITLE_MAX_LENGTH} characters`
    )
  }

  if (
    seoDescription.length >
    SEO_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error(
      `SEO description cannot exceed ${SEO_DESCRIPTION_MAX_LENGTH} characters`
    )
  }
}

/* =========================================================
   IMAGE VALIDATION
========================================================= */

function validateBlobImageUrl(
  image: string
) {
  if (!image) {
    throw new Error(
      "Course image is required"
    )
  }

  /*
   * CourseForm uploads the image to
   * Vercel Blob before calling this API.
   */

  if (
    !image.includes(
      ".blob.vercel-storage.com/"
    )
  ) {
    throw new Error(
      "Invalid course image URL"
    )
  }
}

/* =========================================================
   PARSE OBJECT IDS
========================================================= */

function parseObjectIds(
  value: string,
  fieldName: string
) {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(
      `Invalid ${fieldName}`
    )
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Invalid ${fieldName}`
    )
  }

  return parsed.map(
    (id: unknown) => {
      if (
        typeof id !== "string" ||
        !ObjectId.isValid(id)
      ) {
        throw new Error(
          `Invalid ${fieldName.slice(
            0,
            -1
          )} ID`
        )
      }

      return new ObjectId(id)
    }
  )
}

/* =========================================================
   GET COURSES
========================================================= */

export async function GET(
  req: NextRequest
) {
  try {
    /* -------------------------------------------------------
       AUTHENTICATION
    ------------------------------------------------------- */

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    /* -------------------------------------------------------
       QUERY
    ------------------------------------------------------- */

    const {
      searchParams,
    } = new URL(req.url)

    const search =
      searchParams
        .get("search")
        ?.trim()

    const categoryParam =
      searchParams.get(
        "category"
      )

    const level =
      searchParams.get(
        "level"
      )

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

    /* -------------------------------------------------------
       PAGINATION
    ------------------------------------------------------- */

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
            MAX_LIMIT,
            Math.max(
              1,
              limitParam
            )
          )
        : 20

    const skip =
      (page - 1) *
      limit

    /* -------------------------------------------------------
       FILTER
    ------------------------------------------------------- */

    const filter: Record<
      string,
      unknown
    > = {}

    if (search) {
      filter.name = {
        $regex:
          escapeRegex(search),
        $options: "i",
      }
    }

    if (
      categoryParam &&
      ObjectId.isValid(
        categoryParam
      )
    ) {
      filter.category =
        new ObjectId(
          categoryParam
        )
    }

    if (
      level &&
      COURSE_LEVELS.includes(
        level as any
      )
    ) {
      filter.level =
        level
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

    /* -------------------------------------------------------
       DATABASE
    ------------------------------------------------------- */

    const db =
      await getDb()

    const courses =
      getCourseCollection(db)

    const [
      items,
      total,
    ] = await Promise.all([
      courses
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      courses.countDocuments(
        filter
      ),
    ])

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return NextResponse.json({
      success: true,

      data: items.map(
        (course) => ({
          ...course,

          _id:
            course._id?.toString(),

          category:
            course.category?.toString(),

          skills:
            course.skills?.map(
              (id) =>
                id.toString()
            ) || [],

          tools:
            course.tools?.map(
              (id) =>
                id.toString()
            ) || [],

          seoTitle:
            course.seoTitle ||
            "",

          seoDescription:
            course.seoDescription ||
            "",
        })
      ),

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
      "GET COURSES ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch courses"

    if (
      message ===
        "Authentication required" ||
      message ===
        "Invalid access token" ||
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

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to fetch courses",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================================================
   POST COURSE
========================================================= */

export async function POST(
  req: NextRequest
) {
  try {
    /* -------------------------------------------------------
       CSRF
    ------------------------------------------------------- */

    requireCsrf(req)

    /* -------------------------------------------------------
       AUTHENTICATION
    ------------------------------------------------------- */

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    /* -------------------------------------------------------
       FORM DATA
    ------------------------------------------------------- */

    const formData =
      await req.formData()

    /* =======================================================
       BASIC FIELDS
    ======================================================= */

    const name =
      String(
        formData.get(
          "name"
        ) || ""
      ).trim()

    const categoryValue =
      String(
        formData.get(
          "category"
        ) || ""
      ).trim()

    const level =
      String(
        formData.get(
          "level"
        ) || ""
      ).trim()

    const hours =
      Number(
        formData.get(
          "hours"
        )
      )

    const price =
      Number(
        formData.get(
          "price"
        )
      )

    const discountType =
      String(
        formData.get(
          "discountType"
        ) || "percentage"
      ).trim()

    const discountValue =
      Number(
        formData.get(
          "discountValue"
        ) || 0
      )

    const isActiveValue =
      formData.get(
        "isActive"
      )

    /* =======================================================
       SEO
    ======================================================= */

    const seoTitle =
      String(
        formData.get(
          "seoTitle"
        ) || ""
      ).trim()

    const seoDescription =
      String(
        formData.get(
          "seoDescription"
        ) || ""
      ).trim()

    /* =======================================================
       IMAGE
    ======================================================= */

    /*
     * IMPORTANT:
     *
     * CourseForm uploads the image
     * directly to Vercel Blob.
     *
     * This API receives only the
     * resulting URL.
     */

    const imageValue =
      formData.get(
        "image"
      )

    const image =
      typeof imageValue ===
      "string"
        ? imageValue.trim()
        : ""

    /* =======================================================
       SKILLS
    ======================================================= */

    const skillsValue =
      String(
        formData.get(
          "skills"
        ) || "[]"
      )

    /* =======================================================
       TOOLS
    ======================================================= */

    const toolsValue =
      String(
        formData.get(
          "tools"
        ) || "[]"
      )

    /* =======================================================
       DETAILS
    ======================================================= */

    const detailsValue =
      String(
        formData.get(
          "details"
        ) || "{}"
      )

    /* =======================================================
       BASIC VALIDATION
    ======================================================= */

    if (!name) {
      throw new Error(
        "Course name is required"
      )
    }

    if (
      !ObjectId.isValid(
        categoryValue
      )
    ) {
      throw new Error(
        "Valid category is required"
      )
    }

    if (
      !COURSE_LEVELS.includes(
        level as any
      )
    ) {
      throw new Error(
        "Invalid course level"
      )
    }

    if (
      !DISCOUNT_TYPES.includes(
        discountType as any
      )
    ) {
      throw new Error(
        "Invalid discount type"
      )
    }

    /* =======================================================
       HOURS
    ======================================================= */

    validateHours(
      hours
    )

    /* =======================================================
       SEO
    ======================================================= */

    validateSeo(
      seoTitle,
      seoDescription
    )

    /* =======================================================
       EDITOR.JS
    ======================================================= */

    let details

    try {
      details =
        JSON.parse(
          detailsValue
        )
    } catch {
      throw new Error(
        "Invalid course details"
      )
    }

    validateEditorJs(
      details
    )

    /* =======================================================
       RELATIONS
    ======================================================= */

    const skillIds =
      parseObjectIds(
        skillsValue,
        "skills"
      )

    const toolIds =
      parseObjectIds(
        toolsValue,
        "tools"
      )

    /* =======================================================
       ACTIVE
    ======================================================= */

    let isActive =
      true

    if (
      isActiveValue !==
      null
    ) {
      if (
        isActiveValue !==
          "true" &&
        isActiveValue !==
          "false"
      ) {
        throw new Error(
          "isActive must be true or false"
        )
      }

      isActive =
        isActiveValue ===
        "true"
    }

    /* =======================================================
       PRICE
    ======================================================= */

    const actualPrice =
      calculateActualPrice(
        price,
        discountType as DiscountType,
        discountValue
      )

    /* =======================================================
       IMAGE VALIDATION
    ======================================================= */

    validateBlobImageUrl(
      image
    )

    /* =======================================================
       DATABASE
    ======================================================= */

    const db =
      await getDb()

    const courses =
      getCourseCollection(db)

    /* =======================================================
       DUPLICATE COURSE
    ======================================================= */

    const duplicate =
      await courses.findOne({
        name: {
          $regex:
            `^${escapeRegex(
              name
            )}$`,

          $options: "i",
        },
      })

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Course already exists",
        },
        {
          status: 409,
        }
      )
    }

    /* =======================================================
       VERIFY CATEGORY
    ======================================================= */

    const categories =
      db.collection(
        "categories"
      )

    const categoryExists =
      await categories.findOne({
        _id:
          new ObjectId(
            categoryValue
          ),
      })

    if (!categoryExists) {
      throw new Error(
        "Category not found"
      )
    }

    /* =======================================================
       VERIFY SKILLS
    ======================================================= */

    if (
      skillIds.length > 0
    ) {
      const skillCount =
        await db
          .collection(
            "skills"
          )
          .countDocuments({
            _id: {
              $in: skillIds,
            },
          })

      if (
        skillCount !==
        skillIds.length
      ) {
        throw new Error(
          "One or more skills not found"
        )
      }
    }

    /* =======================================================
       VERIFY TOOLS
    ======================================================= */

    if (
      toolIds.length > 0
    ) {
      const toolCount =
        await db
          .collection(
            "tools"
          )
          .countDocuments({
            _id: {
              $in: toolIds,
            },
          })

      if (
        toolCount !==
        toolIds.length
      ) {
        throw new Error(
          "One or more tools not found"
        )
      }
    }

    /* =======================================================
       INSERT
    ======================================================= */

    const now =
      new Date()

    const result =
      await courses.insertOne({
        name,

        category:
          new ObjectId(
            categoryValue
          ),

        image,

        skills:
          skillIds,

        tools:
          toolIds,

        details,

        hours,

        price,

        discount: {
          type:
            discountType as DiscountType,

          value:
            discountValue,
        },

        actualPrice,

        level:
          level as any,

        seoTitle,

        seoDescription,

        isActive,

        createdAt:
          now,

        updatedAt:
          now,
      })

    /* =======================================================
       AUDIT
    ======================================================= */

    await logAudit({
      userId:
        user._id,

      action:
        "COURSE_CREATED",

      metadata: {
        resource:
          "course",

        courseId:
          result.insertedId.toString(),

        name,

        price,

        discountType,

        discountValue,

        actualPrice,

        seoTitle,

        image,
      },
    })

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        message:
          "Course created successfully",

        data: {
          _id:
            result.insertedId.toString(),

          name,

          category:
            categoryValue,

          image,

          skills:
            skillIds.map(
              (id) =>
                id.toString()
            ),

          tools:
            toolIds.map(
              (id) =>
                id.toString()
            ),

          details,

          hours,

          price,

          discount: {
            type:
              discountType,

            value:
              discountValue,
          },

          actualPrice,

          level,

          seoTitle,

          seoDescription,

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
      "CREATE COURSE ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create course"

    /* =======================================================
       CSRF
    ======================================================= */

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

    /* =======================================================
       AUTH
    ======================================================= */

    if (
      message ===
        "Authentication required" ||
      message ===
        "Invalid access token" ||
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

    /* =======================================================
       PERMISSION
    ======================================================= */

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

    /* =======================================================
       VALIDATION
    ======================================================= */

    if (
      message.includes(
        "required"
      ) ||
      message.includes(
        "Invalid"
      ) ||
      message.includes(
        "discount"
      ) ||
      message.includes(
        "price"
      ) ||
      message.includes(
        "hours"
      ) ||
      message.includes(
        "SEO"
      ) ||
      message.includes(
        "Category not found"
      ) ||
      message.includes(
        "skills not found"
      ) ||
      message.includes(
        "tools not found"
      ) ||
      message.includes(
        "course level"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 400,
        }
      )
    }

    /* =======================================================
       SERVER ERROR
    ======================================================= */

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create course",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================================================
   ESCAPE REGEX
========================================================= */

function escapeRegex(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
}