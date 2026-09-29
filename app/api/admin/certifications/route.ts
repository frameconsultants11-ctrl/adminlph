import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import { authenticate, authorize } from "@/lib/auth"
import { requireCsrf } from "@/lib/require-csrf"

import {
  getCertificationCollection,
} from "@/models/certification"

import {
  uploadCertificationImage,
} from "@/lib/certification-image"

import { logAudit } from "@/lib/audit"

function serializeCertification(
  certification: any
) {
  return {
    ...certification,

    _id: certification._id?.toString(),
  }
}

/* =========================
   GET
========================= */

export async function GET(
  req: NextRequest
) {
  try {
    const user = await authenticate(req)

    authorize(user, "admin")

    const db = await getDb()

    const collection =
      getCertificationCollection(db)

    const { searchParams } =
      new URL(req.url)

    const search =
      searchParams
        .get("search")
        ?.trim() || ""

    const isActive =
      searchParams.get("isActive")

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || 1
      )
    )

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") || 10
        )
      )
    )

    const query: any = {}

    /* Search */

    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      }
    }

    /* Active filter */

    if (
      isActive === "true" ||
      isActive === "false"
    ) {
      query.isActive =
        isActive === "true"
    }

    const skip =
      (page - 1) * limit

    const [
      certifications,
      total,
    ] = await Promise.all([
      collection
        .find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(
        query
      ),
    ])

    return NextResponse.json({
      success: true,

      data: certifications.map(
        serializeCertification
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    })
  } catch (error: any) {
    console.error(
      "GET CERTIFICATIONS ERROR:",
      error
    )

    const status =
      error.message ===
      "Authentication required"
        ? 401
        : error.message.includes(
            "permission"
          )
        ? 403
        : 500

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to fetch certifications",
      },
      {
        status,
      }
    )
  }
}

/* =========================
   POST
========================= */

export async function POST(
  req: NextRequest
) {
  let uploadedImage:
    | string
    | null = null

  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const formData =
      await req.formData()

    const nameValue =
      formData.get("name")

    const imageValue =
      formData.get("image")

    const isActiveValue =
      formData.get("isActive")

    /* Validate name */

    if (
      typeof nameValue !== "string" ||
      !nameValue.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification name is required",
        },
        {
          status: 400,
        }
      )
    }

    const name =
      nameValue.trim()

    /* Validate image */

    if (
      !imageValue ||
      !(imageValue instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification image is required",
        },
        {
          status: 400,
        }
      )
    }

    const isActive =
      isActiveValue === "false"
        ? false
        : true

    const db = await getDb()

    const collection =
      getCertificationCollection(db)

    /* Duplicate check */

    const existing =
      await collection.findOne({
        name: {
          $regex: `^${escapeRegex(
            name
          )}$`,
          $options: "i",
        },
      })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification already exists",
        },
        {
          status: 409,
        }
      )
    }

    /* Upload image */

    uploadedImage =
      await uploadCertificationImage(
        imageValue
      )

    const now = new Date()

    const certification = {
      name,
      image: uploadedImage,
      isActive,

      createdAt: now,
      updatedAt: now,
    }

    const result =
      await collection.insertOne(
        certification
      )

    const created =
      await collection.findOne({
        _id: result.insertedId,
      })

    /* Audit */

    await logAudit({
      userId: user._id,
      action:
        "CERTIFICATION_CREATED",
      metadata: {
        certificationId:
          result.insertedId.toString(),

        name,
      },
    })

    return NextResponse.json(
      {
        success: true,

        message:
          "Certification created successfully",

        data:
          serializeCertification(
            created
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error: any) {
    console.error(
      "CREATE CERTIFICATION ERROR:",
      error
    )

    /*
     * If DB insert/update failed after
     * image upload, remove the new image.
     */

    if (uploadedImage) {
      const {
        deleteCertificationImage,
      } = await import(
        "@/lib/certification-image"
      )

      await deleteCertificationImage(
        uploadedImage
      )
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to create certification",
      },
      {
        status:
          error.message?.includes(
            "CSRF"
          )
            ? 403
            : 500,
      }
    )
  }
}

/* =========================
   REGEX ESCAPE
========================= */

function escapeRegex(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
}