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
  uploadSkillImage,
  deleteSkillImage,
} from "@/lib/skill-image"

import {
  logAudit,
} from "@/lib/audit"


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

    const user =
      await authenticate(req)


    authorize(
      user,
      "admin"
    )


    const {
      id,
    } = await params


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


    const db =
      await getDb()


    const skills =
      getSkillCollection(
        db
      )


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


    return NextResponse.json({
      success: true,
      data: skill,
    })

  } catch (error) {

    console.error(
      "GET SKILL ERROR:",
      error
    )


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

    requireCsrf(req)


    const user =
      await authenticate(req)


    authorize(
      user,
      "admin"
    )


    const {
      id,
    } = await params


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


    const db =
      await getDb()


    const skills =
      getSkillCollection(
        db
      )


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


    // ======================================
    // UPDATE DATA
    // ======================================

    const updateData: {
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


    // ======================================
    // ACTIVE
    // ======================================

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


    // ======================================
    // IMAGE
    // ======================================

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


      const uploaded =
        await uploadSkillImage(
          image
        )


      newImageUrl =
        uploaded.url


      updateData.image =
        uploaded.url
    }


    // ======================================
    // UPDATE
    // ======================================

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


    // ======================================
    // DELETE OLD IMAGE
    // ======================================

    if (
      newImageUrl &&
      existing.image &&
      existing.image !==
        newImageUrl
    ) {

      await deleteSkillImage(
        existing.image
      )
    }


    // ======================================
    // GET UPDATED
    // ======================================

    const updated =
      await skills.findOne({
        _id:
          skillId,
      })


    // ======================================
    // AUDIT
    // ======================================

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


    if (
      newImageUrl
    ) {

      await deleteSkillImage(
        newImageUrl
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

    requireCsrf(req)


    const user =
      await authenticate(req)


    authorize(
      user,
      "admin"
    )


    const {
      id,
    } = await params


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


    const db =
      await getDb()


    const skills =
      getSkillCollection(
        db
      )


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


    // ======================================
    // DELETE IMAGE
    // ======================================

    if (
      skill.image
    ) {

      await deleteSkillImage(
        skill.image
      )

    }


    // ======================================
    // AUDIT
    // ======================================

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
          "Unable to delete skill",
      },
      {
        status: 500,
      }
    )
  }
}