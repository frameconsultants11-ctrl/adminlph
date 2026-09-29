import {
  NextRequest,
  NextResponse,
} from "next/server"

import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import { authenticate, authorize } from "@/lib/auth"
import { requireCsrf } from "@/lib/require-csrf"

import {
  getCertificationCollection,
} from "@/models/certification"

import {
  uploadCertificationImage,
  deleteCertificationImage,
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

function isValidObjectId(
  id: string
) {
  return ObjectId.isValid(id)
}

function escapeRegex(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )
}

/* =========================
   GET
========================= */

export async function GET(
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
    const user =
      await authenticate(req)

    authorize(user, "admin")

    const { id } =
      await params

    if (
      !isValidObjectId(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid certification ID",
        },
        {
          status: 400,
        }
      )
    }

    const db = await getDb()

    const collection =
      getCertificationCollection(db)

    const certification =
      await collection.findOne({
        _id: new ObjectId(id),
      })

    if (!certification) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification not found",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      success: true,

      data:
        serializeCertification(
          certification
        ),
    })
  } catch (error: any) {
    console.error(
      "GET CERTIFICATION ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to fetch certification",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================
   PATCH
========================= */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  let newImage: string | null =
    null

  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const { id } =
      await params

    if (
      !isValidObjectId(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid certification ID",
        },
        {
          status: 400,
        }
      )
    }

    const objectId =
      new ObjectId(id)

    const db = await getDb()

    const collection =
      getCertificationCollection(db)

    const existing =
      await collection.findOne({
        _id: objectId,
      })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification not found",
        },
        {
          status: 404,
        }
      )
    }

    const formData =
      await req.formData()

    const update: any = {
      updatedAt: new Date(),
    }

    /* =========================
       NAME
    ========================= */

    const nameValue =
      formData.get("name")

    if (
      typeof nameValue === "string"
    ) {
      const name =
        nameValue.trim()

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Certification name cannot be empty",
          },
          {
            status: 400,
          }
        )
      }

      const duplicate =
        await collection.findOne({
          _id: {
            $ne: objectId,
          },

          name: {
            $regex: `^${escapeRegex(
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
              "Certification already exists",
          },
          {
            status: 409,
          }
        )
      }

      update.name = name
    }

    /* =========================
       ACTIVE
    ========================= */

    const isActiveValue =
      formData.get("isActive")

    if (
      isActiveValue !== null
    ) {
      update.isActive =
        isActiveValue === "true"
    }

    /* =========================
       IMAGE
    ========================= */

    const imageValue =
      formData.get("image")

    if (
      imageValue &&
      imageValue instanceof File &&
      imageValue.size > 0
    ) {
      newImage =
        await uploadCertificationImage(
          imageValue
        )

      update.image = newImage
    }

    /* =========================
       UPDATE DB
    ========================= */

    const result =
      await collection.updateOne(
        {
          _id: objectId,
        },
        {
          $set: update,
        }
      )

    if (
      result.modifiedCount !== 1
    ) {
      if (newImage) {
        await deleteCertificationImage(
          newImage
        )
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "No changes were made",
        },
        {
          status: 400,
        }
      )
    }

    /* Delete old image only after
       successful DB update */

    if (
      newImage &&
      existing.image
    ) {
      await deleteCertificationImage(
        existing.image
      )
    }

    const updated =
      await collection.findOne({
        _id: objectId,
      })

    await logAudit({
      userId: user._id,
      action:
        "CERTIFICATION_UPDATED",

      metadata: {
        certificationId: id,

        name:
          updated?.name,
      },
    })

    return NextResponse.json({
      success: true,

      message:
        "Certification updated successfully",

      data:
        serializeCertification(
          updated
        ),
    })
  } catch (error: any) {
    console.error(
      "UPDATE CERTIFICATION ERROR:",
      error
    )

    /* Cleanup uploaded image
       if update failed */

    if (newImage) {
      await deleteCertificationImage(
        newImage
      )
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to update certification",
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
   DELETE
========================= */

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
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const { id } =
      await params

    if (
      !isValidObjectId(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid certification ID",
        },
        {
          status: 400,
        }
      )
    }

    const objectId =
      new ObjectId(id)

    const db = await getDb()

    const collection =
      getCertificationCollection(db)

    const existing =
      await collection.findOne({
        _id: objectId,
      })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Certification not found",
        },
        {
          status: 404,
        }
      )
    }

    await collection.deleteOne({
      _id: objectId,
    })

    /* Delete Blob image */

    await deleteCertificationImage(
      existing.image
    )

    await logAudit({
      userId: user._id,
      action:
        "CERTIFICATION_DELETED",

      metadata: {
        certificationId: id,
        name: existing.name,
      },
    })

    return NextResponse.json({
      success: true,

      message:
        "Certification deleted successfully",
    })
  } catch (error: any) {
    console.error(
      "DELETE CERTIFICATION ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to delete certification",
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