// app/api/admin/certifications/[id]/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  ObjectId,
} from "mongodb"

import {
  getDb,
} from "@/lib/db"

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

import {
  logAudit,
} from "@/lib/audit"


// ==========================================
// HELPERS
// ==========================================

function serializeCertification(
  certification: any
) {

  return {

    ...certification,

    _id:
      certification._id?.toString(),

  }

}


function isValidObjectId(
  id: string
) {

  return ObjectId.isValid(
    id
  )

}


function escapeRegex(
  value: string
) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  )

}


// ==========================================
// GET
// ==========================================

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

    // ======================================
    // AUTH
    // ======================================

    const user =
      await authenticate(
        req
      )

    authorize(
      user,
      "admin"
    )


    // ======================================
    // PARAMS
    // ======================================

    const {
      id,
    } = await params


    // ======================================
    // VALIDATE ID
    // ======================================

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


    // ======================================
    // DATABASE
    // ======================================

    const db =
      await getDb()

    const collection =
      getCertificationCollection(
        db
      )


    // ======================================
    // FIND CERTIFICATION
    // ======================================

    const certification =
      await collection.findOne({

        _id:
          new ObjectId(id),

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


    // ======================================
    // RESPONSE
    // ======================================

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


    // ======================================
    // AUTH ERROR
    // ======================================

    if (
      error?.message ===
      "Authentication required"
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


    // ======================================
    // PERMISSION ERROR
    // ======================================

    if (
      error?.message?.includes(
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
          error?.message ||
          "Failed to fetch certification",
      },

      {
        status: 500,
      }

    )

  }

}


// ==========================================
// PATCH
// ==========================================

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

  let newImage:
    | string
    | null = null


  // IMPORTANT:
  // Used to prevent deleting the newly
  // uploaded image if MongoDB already
  // updated successfully.
  let databaseUpdated =
    false


  try {

    // ======================================
    // AUTH
    // ======================================

    const user =
      await authenticate(
        req
      )

    authorize(
      user,
      "admin"
    )


    // ======================================
    // CSRF
    // ======================================

    requireCsrf(
      req
    )


    // ======================================
    // PARAMS
    // ======================================

    const {
      id,
    } = await params


    // ======================================
    // VALIDATE ID
    // ======================================

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


    // ======================================
    // DATABASE
    // ======================================

    const db =
      await getDb()

    const collection =
      getCertificationCollection(
        db
      )


    // ======================================
    // FIND EXISTING
    // ======================================

    const existing =
      await collection.findOne({

        _id:
          objectId,

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


    // ======================================
    // FORM DATA
    // ======================================

    const formData =
      await req.formData()


    // ======================================
    // UPDATE OBJECT
    // ======================================

    const update: {
      name?: string
      isActive?: boolean
      image?: string
      updatedAt: Date
    } = {

      updatedAt:
        new Date(),

    }


    // ======================================
    // NAME
    // ======================================

    const nameValue =
      formData.get(
        "name"
      )


    if (
      typeof nameValue ===
      "string"
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


      // ====================================
      // DUPLICATE CHECK
      // ====================================

      const duplicate =
        await collection.findOne({

          _id: {
            $ne:
              objectId,
          },

          name: {

            $regex:
              `^${escapeRegex(
                name
              )}$`,

            $options:
              "i",

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


      update.name =
        name

    }


    // ======================================
    // ACTIVE
    // ======================================

    const isActiveValue =
      formData.get(
        "isActive"
      )


    if (
      isActiveValue !== null
    ) {

      const value =
        String(
          isActiveValue
        )


      if (
        value !== "true" &&
        value !== "false"
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


      update.isActive =
        value === "true"

    }


    // ======================================
    // IMAGE
    // ======================================

    const imageValue =
      formData.get(
        "image"
      )


    if (
      imageValue instanceof File
    ) {

      if (
        imageValue.size === 0
      ) {

        return NextResponse.json(

          {
            success: false,

            message:
              "Image cannot be empty",
          },

          {
            status: 400,
          }

        )

      }


      // ====================================
      // UPLOAD NEW IMAGE
      // ====================================

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


      newImage =
        uploaded.url


      update.image =
        uploaded.url

    }


    // ======================================
    // UPDATE DATABASE
    // ======================================

    const result =
      await collection.updateOne(

        {
          _id:
            objectId,
        },

        {
          $set:
            update,
        }

      )


    if (
      result.modifiedCount !== 1
    ) {

      // ------------------------------------
      // CLEANUP NEW IMAGE
      // ------------------------------------

      if (newImage) {

        try {

          await deleteImage(
            newImage
          )

        } catch (
          cleanupError
        ) {

          console.error(
            "FAILED TO CLEANUP NEW CERTIFICATION IMAGE:",
            cleanupError
          )

        }

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


    databaseUpdated =
      true


    // ======================================
    // DELETE OLD IMAGE
    // ======================================

    if (
      newImage &&
      existing.image &&
      existing.image !==
        newImage
    ) {

      try {

        await deleteImage(
          existing.image
        )

      } catch (
        imageError
      ) {

        console.error(
          "FAILED TO DELETE OLD CERTIFICATION IMAGE:",
          imageError
        )

      }

    }


    // ======================================
    // GET UPDATED
    // ======================================

    const updated =
      await collection.findOne({

        _id:
          objectId,

      })


    // ======================================
    // AUDIT
    // ======================================

    await logAudit({

      userId:
        user._id,

      action:
        "CERTIFICATION_UPDATED",

      metadata: {

        certificationId:
          id,

        name:
          updated?.name,

        changes: {

          name:
            nameValue !== null,

          isActive:
            isActiveValue !== null,

          image:
            Boolean(
              newImage
            ),

        },

      },

    })


    // ======================================
    // RESPONSE
    // ======================================

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


    // ======================================
    // CLEANUP NEW IMAGE
    // ======================================

    // Only delete the newly uploaded
    // image when MongoDB update failed.
    //
    // If MongoDB already updated, the
    // database is now referencing this
    // image and it must remain available.

    if (
      newImage &&
      !databaseUpdated
    ) {

      try {

        await deleteImage(
          newImage
        )

      } catch (
        cleanupError
      ) {

        console.error(
          "FAILED TO CLEANUP NEW CERTIFICATION IMAGE:",
          cleanupError
        )

      }

    }


    // ======================================
    // CSRF ERROR
    // ======================================

    if (
      error?.message?.includes(
        "CSRF"
      )
    ) {

      return NextResponse.json(

        {
          success: false,

          message:
            error.message ||
            "Invalid CSRF token",
        },

        {
          status: 403,
        }

      )

    }


    // ======================================
    // AUTH ERROR
    // ======================================

    if (
      error?.message ===
        "Authentication required" ||
      error?.message ===
        "Invalid access token"
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


    // ======================================
    // PERMISSION ERROR
    // ======================================

    if (
      error?.message?.includes(
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


    // ======================================
    // IMAGE ERROR
    // ======================================

    if (
      error?.message?.includes(
        "Only JPG"
      ) ||
      error?.message?.includes(
        "Image size"
      ) ||
      error?.message?.includes(
        "background"
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


    // ======================================
    // GENERAL ERROR
    // ======================================

    return NextResponse.json(

      {
        success: false,

        message:
          error?.message ||
          "Failed to update certification",
      },

      {
        status: 500,
      }

    )

  }

}


// ==========================================
// DELETE
// ==========================================

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

    // ======================================
    // AUTH
    // ======================================

    const user =
      await authenticate(
        req
      )

    authorize(
      user,
      "admin"
    )


    // ======================================
    // CSRF
    // ======================================

    requireCsrf(
      req
    )


    // ======================================
    // PARAMS
    // ======================================

    const {
      id,
    } = await params


    // ======================================
    // VALIDATE ID
    // ======================================

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


    // ======================================
    // DATABASE
    // ======================================

    const db =
      await getDb()

    const collection =
      getCertificationCollection(
        db
      )


    // ======================================
    // FIND EXISTING
    // ======================================

    const existing =
      await collection.findOne({

        _id:
          objectId,

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


    // ======================================
    // DELETE DATABASE RECORD
    // ======================================

    const result =
      await collection.deleteOne({

        _id:
          objectId,

      })


    if (
      result.deletedCount !== 1
    ) {

      return NextResponse.json(

        {
          success: false,

          message:
            "Unable to delete certification",
        },

        {
          status: 500,
        }

      )

    }


    // ======================================
    // DELETE IMAGE
    // ======================================

    if (
      existing.image
    ) {

      try {

        await deleteImage(
          existing.image
        )

      } catch (
        imageError
      ) {

        console.error(
          "FAILED TO DELETE CERTIFICATION IMAGE:",
          imageError
        )

      }

    }


    // ======================================
    // AUDIT
    // ======================================

    await logAudit({

      userId:
        user._id,

      action:
        "CERTIFICATION_DELETED",

      metadata: {

        certificationId:
          id,

        name:
          existing.name,

        image:
          existing.image,

      },

    })


    // ======================================
    // RESPONSE
    // ======================================

    return NextResponse.json({

      success:
        true,

      message:
        "Certification deleted successfully",

    })

  } catch (error: any) {

    console.error(
      "DELETE CERTIFICATION ERROR:",
      error
    )


    // ======================================
    // CSRF ERROR
    // ======================================

    if (
      error?.message?.includes(
        "CSRF"
      )
    ) {

      return NextResponse.json(

        {
          success: false,

          message:
            error.message ||
            "Invalid CSRF token",
        },

        {
          status: 403,
        }

      )

    }


    // ======================================
    // AUTH ERROR
    // ======================================

    if (
      error?.message ===
        "Authentication required" ||
      error?.message ===
        "Invalid access token"
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


    // ======================================
    // PERMISSION ERROR
    // ======================================

    if (
      error?.message?.includes(
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


    // ======================================
    // GENERAL ERROR
    // ======================================

    return NextResponse.json(

      {
        success: false,

        message:
          error?.message ||
          "Failed to delete certification",
      },

      {
        status: 500,
      }

    )

  }

}