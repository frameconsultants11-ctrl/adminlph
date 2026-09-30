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

import { del } from "@vercel/blob"

import { logAudit } from "@/lib/audit"

import {
  Course,
  CourseLevel,
  DiscountType,
  EditorJsContent,
  getCourseCollection,
} from "@/models/course"

import {
  calculateActualPrice,
  COURSE_LEVELS,
  DISCOUNT_TYPES,
  validateEditorJs,
  validateHours,
} from "@/lib/course-validation"

/* =========================================================
   ROUTE CONTEXT
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/* =========================================================
   SEO
========================================================= */

const SEO_TITLE_MAX_LENGTH = 60

const SEO_DESCRIPTION_MAX_LENGTH = 160

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
   BLOB IMAGE
========================================================= */

function isVercelBlobUrl(
  url: string
) {
  return (
    url.includes(
      ".blob.vercel-storage.com/"
    )
  )
}

function validateBlobImageUrl(
  url: string
) {
  if (!url) {
    throw new Error(
      "Course image is required"
    )
  }

  if (!isVercelBlobUrl(url)) {
    throw new Error(
      "Invalid course image URL"
    )
  }
}

/* =========================================================
   DELETE BLOB SAFELY
========================================================= */

async function deleteBlobImage(
  url?: string
) {
  if (!url) {
    return
  }

  if (!isVercelBlobUrl(url)) {
    return
  }

  try {
    await del(url)
  } catch (error) {
    console.error(
      "BLOB DELETE ERROR:",
      error
    )
  }
}

/* =========================================================
   PARSE BOOLEAN
========================================================= */

function parseBoolean(
  value: FormDataEntryValue | null
) {
  if (value === null) {
    return undefined
  }

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  throw new Error(
    "Invalid isActive value"
  )
}

/* =========================================================
   PARSE NUMBER
========================================================= */

function parseNumber(
  value: FormDataEntryValue | null,
  fieldName: string
) {
  if (
    value === null ||
    value === ""
  ) {
    throw new Error(
      `${fieldName} is required`
    )
  }

  const number =
    Number(value)

  if (!Number.isFinite(number)) {
    throw new Error(
      `${fieldName} must be a valid number`
    )
  }

  return number
}

/* =========================================================
   PARSE OBJECT ID
========================================================= */

function parseObjectId(
  value: FormDataEntryValue | null,
  fieldName: string
) {
  if (
    !value ||
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} is required`
    )
  }

  if (
    !ObjectId.isValid(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}`
    )
  }

  return new ObjectId(value)
}

/* =========================================================
   PARSE OBJECT ID ARRAY
========================================================= */

function parseObjectIdArray(
  value: FormDataEntryValue | null,
  fieldName: string
): ObjectId[] {
  if (
    value === null ||
    value === ""
  ) {
    return []
  }

  let parsed: unknown

  try {
    parsed =
      JSON.parse(
        String(value)
      )
  } catch {
    throw new Error(
      `${fieldName} must be valid JSON`
    )
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `${fieldName} must be an array`
    )
  }

  return parsed.map(
    (id) => {
      if (
        typeof id !== "string" ||
        !ObjectId.isValid(id)
      ) {
        throw new Error(
          `Invalid ${fieldName} ID`
        )
      }

      return new ObjectId(id)
    }
  )
}

/* =========================================================
   PARSE EDITOR.JS
========================================================= */

function parseEditorJs(
  value: FormDataEntryValue | null
): EditorJsContent {
  if (
    !value ||
    typeof value !== "string"
  ) {
    throw new Error(
      "Course details are required"
    )
  }

  let details: EditorJsContent

  try {
    details =
      JSON.parse(value)
  } catch {
    throw new Error(
      "Course details must be valid JSON"
    )
  }

  validateEditorJs(
    details
  )

  return details
}

/* =========================================================
   SERIALIZE COURSE
========================================================= */

function serializeCourse(
  course: Course
) {
  return {
    _id:
      course._id?.toString(),

    name:
      course.name,

    category:
      course.category.toString(),

    image:
      course.image,

    skills:
      course.skills.map(
        (id) =>
          id.toString()
      ),

    tools:
      course.tools.map(
        (id) =>
          id.toString()
      ),

    details:
      course.details,

    hours:
      course.hours,

    price:
      course.price,

    discount: {
      type:
        course.discount.type,

      value:
        course.discount.value,
    },

    actualPrice:
      course.actualPrice,

    level:
      course.level,

    seoTitle:
      course.seoTitle || "",

    seoDescription:
      course.seoDescription ||
      "",

    isActive:
      course.isActive,

    createdAt:
      course.createdAt,

    updatedAt:
      course.updatedAt,
  }
}

/* =========================================================
   GET COURSE
========================================================= */

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    const {
      id,
    } = await context.params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid course ID",
        },
        {
          status: 400,
        }
      )
    }

    const db =
      await getDb()

    const courses =
      getCourseCollection(db)

    const course =
      await courses.findOne({
        _id:
          new ObjectId(id),
      })

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Course not found",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      success: true,

      data:
        serializeCourse(
          course
        ),
    })
  } catch (error) {
    console.error(
      "GET COURSE ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch course"

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
        message,
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================================================
   PATCH COURSE
========================================================= */

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  let newUploadedImageUrl:
    | string
    | undefined

  try {
    /* -------------------------------------------------------
       AUTH
    ------------------------------------------------------- */

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    requireCsrf(req)

    /* -------------------------------------------------------
       ID
    ------------------------------------------------------- */

    const {
      id,
    } = await context.params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid course ID",
        },
        {
          status: 400,
        }
      )
    }

    const courseId =
      new ObjectId(id)

    /* -------------------------------------------------------
       DATABASE
    ------------------------------------------------------- */

    const db =
      await getDb()

    const courses =
      getCourseCollection(db)

    const existingCourse =
      await courses.findOne({
        _id: courseId,
      })

    if (!existingCourse) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Course not found",
        },
        {
          status: 404,
        }
      )
    }

    /* -------------------------------------------------------
       FORM DATA
    ------------------------------------------------------- */

    const formData =
      await req.formData()

    const update:
      Partial<Course> = {}

    /* =======================================================
       NAME
    ======================================================= */

    const nameValue =
      formData.get(
        "name"
      )

    if (
      nameValue !== null
    ) {
      if (
        typeof nameValue !==
        "string"
      ) {
        throw new Error(
          "Invalid course name"
        )
      }

      const name =
        nameValue.trim()

      if (!name) {
        throw new Error(
          "Course name is required"
        )
      }

      const duplicate =
        await courses.findOne({
          _id: {
            $ne:
              courseId,
          },

          name: {
            $regex:
              `^${escapeRegex(
                name
              )}$`,

            $options: "i",
          },
        })

      if (duplicate) {
        throw new Error(
          "A course with this name already exists"
        )
      }

      update.name =
        name
    }

    /* =======================================================
       CATEGORY
    ======================================================= */

    const categoryValue =
      formData.get(
        "category"
      )

    if (
      categoryValue !== null
    ) {
      const categoryId =
        parseObjectId(
          categoryValue,
          "category"
        )

      const category =
        await db
          .collection(
            "categories"
          )
          .findOne({
            _id:
              categoryId,
          })

      if (!category) {
        throw new Error(
          "Category not found"
        )
      }

      update.category =
        categoryId
    }

    /* =======================================================
       SKILLS
    ======================================================= */

    const skillsValue =
      formData.get(
        "skills"
      )

    if (
      skillsValue !== null
    ) {
      const skills =
        parseObjectIdArray(
          skillsValue,
          "skills"
        )

      if (
        skills.length > 0
      ) {
        const count =
          await db
            .collection(
              "skills"
            )
            .countDocuments({
              _id: {
                $in: skills,
              },
            })

        if (
          count !==
          skills.length
        ) {
          throw new Error(
            "One or more skills were not found"
          )
        }
      }

      update.skills =
        skills
    }

    /* =======================================================
       TOOLS
    ======================================================= */

    const toolsValue =
      formData.get(
        "tools"
      )

    if (
      toolsValue !== null
    ) {
      const tools =
        parseObjectIdArray(
          toolsValue,
          "tools"
        )

      if (
        tools.length > 0
      ) {
        const count =
          await db
            .collection(
              "tools"
            )
            .countDocuments({
              _id: {
                $in: tools,
              },
            })

        if (
          count !==
          tools.length
        ) {
          throw new Error(
            "One or more tools were not found"
          )
        }
      }

      update.tools =
        tools
    }

    /* =======================================================
       EDITOR.JS DETAILS
    ======================================================= */

    const detailsValue =
      formData.get(
        "details"
      )

    if (
      detailsValue !== null
    ) {
      update.details =
        parseEditorJs(
          detailsValue
        )
    }

    /* =======================================================
       HOURS
    ======================================================= */

    const hoursValue =
      formData.get(
        "hours"
      )

    if (
      hoursValue !== null
    ) {
      const hours =
        parseNumber(
          hoursValue,
          "Course hours"
        )

      validateHours(
        hours
      )

      update.hours =
        hours
    }

    /* =======================================================
       PRICE
    ======================================================= */

    const priceValue =
      formData.get(
        "price"
      )

    let price =
      existingCourse.price

    if (
      priceValue !== null
    ) {
      price =
        parseNumber(
          priceValue,
          "Course price"
        )

      if (price < 0) {
        throw new Error(
          "Course price cannot be negative"
        )
      }

      update.price =
        price
    }

    /* =======================================================
       DISCOUNT
    ======================================================= */

    const discountTypeValue =
      formData.get(
        "discountType"
      )

    const discountValueValue =
      formData.get(
        "discountValue"
      )

    let discountType:
      DiscountType =
        existingCourse
          .discount
          .type

    let discountValue =
      existingCourse
        .discount
        .value

    if (
      discountTypeValue !==
      null
    ) {
      if (
        typeof discountTypeValue !==
          "string" ||
        !DISCOUNT_TYPES.includes(
          discountTypeValue as DiscountType
        )
      ) {
        throw new Error(
          "Invalid discount type"
        )
      }

      discountType =
        discountTypeValue as DiscountType
    }

    if (
      discountValueValue !==
      null
    ) {
      discountValue =
        parseNumber(
          discountValueValue,
          "Discount value"
        )

      if (
        discountValue < 0
      ) {
        throw new Error(
          "Discount value cannot be negative"
        )
      }
    }

    const pricingChanged =
      priceValue !== null ||
      discountTypeValue !==
        null ||
      discountValueValue !==
        null

    if (pricingChanged) {
      const actualPrice =
        calculateActualPrice(
          price,
          discountType,
          discountValue
        )

      update.discount = {
        type:
          discountType,

        value:
          discountValue,
      }

      update.actualPrice =
        actualPrice
    }

    /* =======================================================
       LEVEL
    ======================================================= */

    const levelValue =
      formData.get(
        "level"
      )

    if (
      levelValue !== null
    ) {
      if (
        typeof levelValue !==
          "string" ||
        !COURSE_LEVELS.includes(
          levelValue as CourseLevel
        )
      ) {
        throw new Error(
          "Invalid course level"
        )
      }

      update.level =
        levelValue as CourseLevel
    }

    /* =======================================================
       SEO TITLE
    ======================================================= */

    const seoTitleValue =
      formData.get(
        "seoTitle"
      )

    if (
      seoTitleValue !== null
    ) {
      if (
        typeof seoTitleValue !==
        "string"
      ) {
        throw new Error(
          "Invalid SEO title"
        )
      }

      const seoTitle =
        seoTitleValue.trim()

      if (!seoTitle) {
        throw new Error(
          "SEO title is required"
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

      update.seoTitle =
        seoTitle
    }

    /* =======================================================
       SEO DESCRIPTION
    ======================================================= */

    const seoDescriptionValue =
      formData.get(
        "seoDescription"
      )

    if (
      seoDescriptionValue !==
      null
    ) {
      if (
        typeof seoDescriptionValue !==
        "string"
      ) {
        throw new Error(
          "Invalid SEO description"
        )
      }

      const seoDescription =
        seoDescriptionValue.trim()

      if (!seoDescription) {
        throw new Error(
          "SEO description is required"
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

      update.seoDescription =
        seoDescription
    }

    /* =======================================================
       ACTIVE STATUS
    ======================================================= */

    const isActiveValue =
      formData.get(
        "isActive"
      )

    if (
      isActiveValue !==
      null
    ) {
      const isActive =
        parseBoolean(
          isActiveValue
        )

      if (
        isActive !==
        undefined
      ) {
        update.isActive =
          isActive
      }
    }

    /* =======================================================
       IMAGE
    ======================================================= */

    const imageValue =
      formData.get(
        "image"
      )

    /*
     * The new CourseForm uploads the
     * image directly to Vercel Blob.
     *
     * Therefore this API receives:
     *
     * image = "https://....blob.vercel-storage.com/..."
     */

    if (
      imageValue !== null
    ) {
      if (
        typeof imageValue !==
        "string"
      ) {
        throw new Error(
          "Invalid course image"
        )
      }

      const image =
        imageValue.trim()

      validateBlobImageUrl(
        image
      )

      /*
       * Keep track of the new image.
       *
       * If MongoDB update fails,
       * this image will be deleted.
       */

      newUploadedImageUrl =
        image

      update.image =
        image
    }

    /* =======================================================
       NOTHING TO UPDATE
    ======================================================= */

    if (
      Object.keys(update)
        .length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No changes provided",
        },
        {
          status: 400,
        }
      )
    }

    /* =======================================================
       UPDATED AT
    ======================================================= */

    update.updatedAt =
      new Date()

    /* =======================================================
       UPDATE DATABASE
    ======================================================= */

    const result =
      await courses.findOneAndUpdate(
        {
          _id: courseId,
        },
        {
          $set: update,
        },
        {
          returnDocument:
            "after",
        }
      )

    const updatedCourse =
      result

    if (!updatedCourse) {
      throw new Error(
        "Failed to update course"
      )
    }

    /* =======================================================
       DELETE OLD IMAGE
       AFTER DATABASE SUCCESS
    ======================================================= */

    if (
      update.image &&
      existingCourse.image &&
      existingCourse.image !==
        update.image
    ) {
      await deleteBlobImage(
        existingCourse.image
      )
    }

    /*
     * The new image now belongs to
     * the course, so don't delete it
     * inside the catch block.
     */

    newUploadedImageUrl =
      undefined

    /* =======================================================
       AUDIT
    ======================================================= */

    await logAudit({
      userId:
        user._id,

      action:
        "COURSE_UPDATED",

      ip:
        req.headers.get(
          "x-forwarded-for"
        ) ||
        undefined,

      userAgent:
        req.headers.get(
          "user-agent"
        ) ||
        undefined,

      metadata: {
        courseId:
          courseId.toString(),

        changes:
          Object.keys(update),
      },
    })

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json({
      success: true,

      message:
        "Course updated successfully",

      data:
        serializeCourse(
          updatedCourse
        ),
    })
  } catch (error) {
    /* =======================================================
       CLEANUP NEW BLOB
    ======================================================= */

    /*
     * This happens only if:
     *
     * 1. A new Blob URL was supplied
     * 2. MongoDB update failed
     *
     * Therefore the newly uploaded
     * image doesn't become orphaned.
     */

    if (
      newUploadedImageUrl
    ) {
      await deleteBlobImage(
        newUploadedImageUrl
      )
    }

    /* =======================================================
       ERROR
    ======================================================= */

    console.error(
      "UPDATE COURSE ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update course"

    /* =======================================================
       STATUS
    ======================================================= */

    let status = 500

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
      status = 401
    } else if (
      message.includes(
        "permission"
      )
    ) {
      status = 403
    } else if (
      message.includes(
        "not found"
      )
    ) {
      status = 404
    } else if (
      message ===
      "Invalid CSRF token"
    ) {
      status = 403
    } else if (
      message.includes(
        "required"
      ) ||
      message.includes(
        "Invalid"
      ) ||
      message.includes(
        "cannot"
      ) ||
      message.includes(
        "must"
      ) ||
      message.includes(
        "already exists"
      ) ||
      message.includes(
        "SEO"
      )
    ) {
      status = 400
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status,
      }
    )
  }
}

/* =========================================================
   DELETE COURSE
========================================================= */

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    /* -------------------------------------------------------
       AUTH
    ------------------------------------------------------- */

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    requireCsrf(req)

    /* -------------------------------------------------------
       ID
    ------------------------------------------------------- */

    const {
      id,
    } = await context.params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid course ID",
        },
        {
          status: 400,
        }
      )
    }

    const courseId =
      new ObjectId(id)

    /* -------------------------------------------------------
       DATABASE
    ------------------------------------------------------- */

    const db =
      await getDb()

    const courses =
      getCourseCollection(db)

    const course =
      await courses.findOne({
        _id: courseId,
      })

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Course not found",
        },
        {
          status: 404,
        }
      )
    }

    /* -------------------------------------------------------
       DELETE DATABASE RECORD
    ------------------------------------------------------- */

    const result =
      await courses.deleteOne({
        _id: courseId,
      })

    if (
      result.deletedCount !== 1
    ) {
      throw new Error(
        "Failed to delete course"
      )
    }

    /* -------------------------------------------------------
       DELETE COURSE IMAGE
    ------------------------------------------------------- */

    if (
      course.image &&
      isVercelBlobUrl(
        course.image
      )
    ) {
      await deleteBlobImage(
        course.image
      )
    }

    /* -------------------------------------------------------
       AUDIT
    ------------------------------------------------------- */

    await logAudit({
      userId:
        user._id,

      action:
        "COURSE_DELETED",

      ip:
        req.headers.get(
          "x-forwarded-for"
        ) ||
        undefined,

      userAgent:
        req.headers.get(
          "user-agent"
        ) ||
        undefined,

      metadata: {
        courseId:
          courseId.toString(),

        courseName:
          course.name,

        image:
          course.image,
      },
    })

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return NextResponse.json({
      success: true,

      message:
        "Course deleted successfully",
    })
  } catch (error) {
    console.error(
      "DELETE COURSE ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete course"

    /* -------------------------------------------------------
       STATUS
    ------------------------------------------------------- */

    let status = 500

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
      status = 401
    } else if (
      message.includes(
        "permission"
      )
    ) {
      status = 403
    } else if (
      message.includes(
        "not found"
      )
    ) {
      status = 404
    } else if (
      message ===
      "Invalid CSRF token"
    ) {
      status = 403
    }

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status,
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