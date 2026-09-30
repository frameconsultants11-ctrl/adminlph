import {
  NextRequest,
  NextResponse,
} from "next/server"

import { getDb } from "@/lib/db"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  getCertificationCollection,
} from "@/models/certification"

import {
  uploadImage,
  deleteImage,
} from "@/lib/image/image-upload"

import { logAudit } from "@/lib/audit"


function serializeCertification(
  certification: any
) {
  return {
    ...certification,

    _id:
      certification._id?.toString(),
  }
}


/* =========================
   GET
========================= */

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

    const db =
      await getDb()

    const collection =
      getCertificationCollection(
        db
      )

    const {
      searchParams,
    } = new URL(
      req.url
    )

    const search =
      searchParams
        .get("search")
        ?.trim() || ""

    const isActive =
      searchParams.get(
        "isActive"
      )

    const page =
      Math.max(
        1,
        Number(
          searchParams.get(
            "page"
          ) || 1
        )
      )

    const limit =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            searchParams.get(
              "limit"
            ) || 10
          )
        )
      )

    const query: any = {}


    /* =========================
       SEARCH
    ========================= */

    if (search) {

      query.name = {
        $regex:
          escapeRegex(search),

        $options: "i",
      }

    }


    /* =========================
       ACTIVE FILTER
    ========================= */

    if (
      isActive === "true" ||
      isActive === "false"
    ) {

      query.isActive =
        isActive === "true"

    }


    const skip =
      (page - 1) *
      limit


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

      data:
        certifications.map(
          serializeCertification
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

  } catch (error: any) {

    console.error(
      "GET CERTIFICATIONS ERROR:",
      error
    )


    const status =
      error.message ===
      "Authentication required"

        ? 401

        : error.message?.includes(
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

    /* =========================
       AUTH
    ========================= */

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )

    requireCsrf(req)


    /* =========================
       FORM DATA
    ========================= */

    const formData =
      await req.formData()


    const nameValue =
      formData.get("name")

    const imageValue =
      formData.get("image")

    const isActiveValue =
      formData.get(
        "isActive"
      )


    /* =========================
       VALIDATE NAME
    ========================= */

    if (
      typeof nameValue !==
        "string" ||
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


    /* =========================
       VALIDATE IMAGE
    ========================= */

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


    if (
      imageValue.size === 0
    ) {

      return NextResponse.json(

        {
          success: false,

          message:
            "Certification image cannot be empty",
        },

        {
          status: 400,
        }

      )

    }


    /* =========================
       ACTIVE
    ========================= */

    const isActive =
      isActiveValue === "false"
        ? false
        : true


    /* =========================
       DATABASE
    ========================= */

    const db =
      await getDb()

    const collection =
      getCertificationCollection(
        db
      )


    /* =========================
       DUPLICATE CHECK
    ========================= */

    const existing =
      await collection.findOne({

        name: {
          $regex:
            `^${escapeRegex(
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


    /* =========================
       UPLOAD IMAGE
    ========================= */

    const uploaded =
      await uploadImage(
        imageValue,
        {
          folder:
            "certifications",

          removeBackground:
            true,

          backgroundModel:
            "medium",

          maxWidth:
            1200,

          maxHeight:
            1200,

          format:
            "png",

          quality:
            90,
        }
      )


    uploadedImage =
      uploaded.url


    /* =========================
       CREATE DOCUMENT
    ========================= */

    const now =
      new Date()


    const certification = {

      name,

      image:
        uploaded.url,

      isActive,

      createdAt:
        now,

      updatedAt:
        now,

    }


    const result =
      await collection.insertOne(
        certification
      )


    /* =========================
       FETCH CREATED
    ========================= */

    const created =
      await collection.findOne({

        _id:
          result.insertedId,

      })


    /* =========================
       AUDIT
    ========================= */

    await logAudit({

      userId:
        user._id,

      action:
        "CERTIFICATION_CREATED",

      metadata: {

        certificationId:
          result.insertedId.toString(),

        name,

      },

    })


    /* =========================
       RESPONSE
    ========================= */

    return NextResponse.json(

      {

        success:
          true,

        message:
          "Certification created successfully",

        data:
          serializeCertification(
            created
          ),

      },

      {
        status:
          201,
      }

    )

  } catch (error: any) {

    console.error(
      "CREATE CERTIFICATION ERROR:",
      error
    )


    /* =========================
       CLEANUP IMAGE
    ========================= */

    if (uploadedImage) {

      try {

        await deleteImage(
          uploadedImage
        )

      } catch (
        cleanupError
      ) {

        console.error(
          "FAILED TO DELETE CERTIFICATION IMAGE:",
          cleanupError
        )

      }

    }


    /* =========================
       ERROR RESPONSE
    ========================= */

    return NextResponse.json(

      {

        success:
          false,

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
            : error.message?.includes(
                "permission"
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