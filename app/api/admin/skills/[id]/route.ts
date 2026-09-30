// app/api/admin/skills/[id]/route.ts

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
  getSkillCollection,
} from "@/lib/skill"

import {
  uploadImage,
  deleteImage,
} from "@/lib/image/image-upload"

import {
  logAudit,
} from "@/lib/audit"


// ==========================================
// PARAMS
// ==========================================

type Params = {
  params: Promise<{
    id: string
  }>
}


// ==========================================
// GET
// ==========================================

export async function GET(
  req: NextRequest,
  {
    params,
  }: Params
) {

  try {

    // ==========================================
    // AUTH
    // ==========================================

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )


    // ==========================================
    // PARAMS
    // ==========================================

    const {
      id,
    } = await params


    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !ObjectId.isValid(id)
    ) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid skill ID",
        },
        {
          status: 400,
        }
      )

    }


    // ==========================================
    // DATABASE
    // ==========================================

    const db =
      await getDb()

    const skills =
      getSkillCollection(
        db
      )


    // ==========================================
    // GET SKILL
    // ==========================================

    const skill =
      await skills.findOne({
        _id:
          new ObjectId(id),
      })


    if (!skill) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Skill not found",
        },
        {
          status: 404,
        }
      )

    }


    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,

      data: skill,
    })

  } catch (error) {

    console.error(
      "GET SKILL ERROR:",
      error
    )


    // ==========================================
    // AUTH ERROR
    // ==========================================

    if (
      error instanceof Error &&
      error.message ===
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


    // ==========================================
    // PERMISSION ERROR
    // ==========================================

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
          "Unable to fetch skill",
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
  }: Params
) {

  let newImageUrl:
    | string
    | undefined


  try {

    // ==========================================
    // CSRF
    // ==========================================

    requireCsrf(req)


    // ==========================================
    // AUTH
    // ==========================================

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )


    // ==========================================
    // PARAMS
    // ==========================================

    const {
      id,
    } = await params


    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !ObjectId.isValid(id)
    ) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid skill ID",
        },
        {
          status: 400,
        }
      )

    }


    const skillId =
      new ObjectId(id)


    // ==========================================
    // DATABASE
    // ==========================================

    const db =
      await getDb()

    const skills =
      getSkillCollection(
        db
      )


    // ==========================================
    // GET EXISTING SKILL
    // ==========================================

    const existing =
      await skills.findOne({
        _id:
          skillId,
      })


    if (!existing) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Skill not found",
        },
        {
          status: 404,
        }
      )

    }


    // ==========================================
    // FORM DATA
    // ==========================================

    const formData =
      await req.formData()


    const nameValue =
      formData.get(
        "name"
      )

    const isActiveValue =
      formData.get(
        "isActive"
      )

    const image =
      formData.get(
        "image"
      )


    // ==========================================
    // UPDATE DATA
    // ==========================================

    const updateData: {
      name?: string
      isActive?: boolean
      image?: string
      updatedAt: Date
    } = {

      updatedAt:
        new Date(),

    }


    // ==========================================
    // NAME
    // ==========================================

    if (
      nameValue !== null
    ) {

      const name =
        String(
          nameValue
        ).trim()


      if (!name) {

        return NextResponse.json(
          {
            success: false,

            message:
              "Skill name cannot be empty",
          },
          {
            status: 400,
          }
        )

      }


      updateData.name =
        name

    }


    // ==========================================
    // ACTIVE
    // ==========================================

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


      updateData.isActive =
        value === "true"

    }


    // ==========================================
    // IMAGE
    // ==========================================

    if (
      image instanceof File
    ) {

      if (
        image.size === 0
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


      // ==========================================
      // UPLOAD NEW IMAGE
      // ==========================================

      const uploaded =
        await uploadImage(
          image,
          {
            folder:
              "skills",

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


      newImageUrl =
        uploaded.url


      updateData.image =
        uploaded.url

    }


    // ==========================================
    // UPDATE DATABASE
    // ==========================================

    await skills.updateOne(
      {
        _id:
          skillId,
      },
      {
        $set:
          updateData,
      }
    )


    // ==========================================
    // DELETE OLD IMAGE
    // ==========================================

    if (
      newImageUrl &&
      existing.image &&
      existing.image !==
        newImageUrl
    ) {

      try {

        await deleteImage(
          existing.image
        )

      } catch (
        cleanupError
      ) {

        console.error(
          "FAILED TO DELETE OLD SKILL IMAGE:",
          cleanupError
        )

      }

    }


    // ==========================================
    // GET UPDATED
    // ==========================================

    const updated =
      await skills.findOne({
        _id:
          skillId,
      })


    // ==========================================
    // AUDIT
    // ==========================================

    await logAudit({

      userId:
        user._id,

      action:
        "SKILL_UPDATED",

      metadata: {

        resource:
          "skill",

        skillId:
          id,

        changes: {

          name:
            nameValue !== null,

          isActive:
            isActiveValue !==
            null,

          image:
            Boolean(
              newImageUrl
            ),

        },

      },

    })


    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({

      success: true,

      message:
        "Skill updated successfully",

      data:
        updated,

    })

  } catch (error) {

    console.error(
      "UPDATE SKILL ERROR:",
      error
    )


    // ==========================================
    // CLEANUP NEW IMAGE
    // ==========================================

    if (
      newImageUrl
    ) {

      try {

        await deleteImage(
          newImageUrl
        )

      } catch (
        cleanupError
      ) {

        console.error(
          "FAILED TO CLEANUP NEW SKILL IMAGE:",
          cleanupError
        )

      }

    }


    // ==========================================
    // CSRF ERROR
    // ==========================================

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


    // ==========================================
    // IMAGE ERROR
    // ==========================================

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


    // ==========================================
    // AUTH ERROR
    // ==========================================

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


    // ==========================================
    // PERMISSION ERROR
    // ==========================================

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


    // ==========================================
    // GENERAL ERROR
    // ==========================================

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update skill",
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
  }: Params
) {

  try {

    // ==========================================
    // CSRF
    // ==========================================

    requireCsrf(req)


    // ==========================================
    // AUTH
    // ==========================================

    const user =
      await authenticate(req)

    authorize(
      user,
      "admin"
    )


    // ==========================================
    // PARAMS
    // ==========================================

    const {
      id,
    } = await params


    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !ObjectId.isValid(id)
    ) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid skill ID",
        },
        {
          status: 400,
        }
      )

    }


    const skillId =
      new ObjectId(id)


    // ==========================================
    // DATABASE
    // ==========================================

    const db =
      await getDb()

    const skills =
      getSkillCollection(
        db
      )


    // ==========================================
    // GET SKILL
    // ==========================================

    const skill =
      await skills.findOne({
        _id:
          skillId,
      })


    if (!skill) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Skill not found",
        },
        {
          status: 404,
        }
      )

    }


    // ==========================================
    // DELETE DATABASE RECORD
    // ==========================================

    const deleteResult =
      await skills.deleteOne({
        _id:
          skillId,
      })


    if (
      deleteResult.deletedCount !==
      1
    ) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Unable to delete skill",
        },
        {
          status: 500,
        }
      )

    }


    // ==========================================
    // DELETE IMAGE
    // ==========================================

    if (
      skill.image
    ) {

      try {

        await deleteImage(
          skill.image
        )

      } catch (
        imageError
      ) {

        console.error(
          "FAILED TO DELETE SKILL IMAGE:",
          imageError
        )

      }

    }


    // ==========================================
    // AUDIT
    // ==========================================

    await logAudit({

      userId:
        user._id,

      action:
        "SKILL_DELETED",

      metadata: {

        resource:
          "skill",

        skillId:
          id,

        name:
          skill.name,

        image:
          skill.image,

      },

    })


    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({

      success: true,

      message:
        "Skill deleted successfully",

    })

  } catch (error) {

    console.error(
      "DELETE SKILL ERROR:",
      error
    )


    // ==========================================
    // CSRF ERROR
    // ==========================================

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


    // ==========================================
    // AUTH ERROR
    // ==========================================

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


    // ==========================================
    // PERMISSION ERROR
    // ==========================================

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


    // ==========================================
    // GENERAL ERROR
    // ==========================================

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to delete skill",
      },
      {
        status: 500,
      }
    )

  }

}