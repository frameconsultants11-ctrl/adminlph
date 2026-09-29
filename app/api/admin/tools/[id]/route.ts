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
  getToolCollection,
} from "@/models/tool"

import {
  uploadToolImage,
  deleteToolImage,
} from "@/lib/tool-image"

import {
  logAudit,
} from "@/lib/audit"


type Params = {
  params: Promise<{
    id: string
  }>
}


// ============================================
// GET /api/admin/tools/:id
// ============================================

export async function GET(
  req: NextRequest,
  {
    params,
  }: Params
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
    // PARAMS
    // --------------------------------

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
            "Invalid tool ID",
        },
        {
          status: 400,
        }
      )
    }

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const tools =
      getToolCollection(db)

    const tool =
      await tools.findOne({
        _id:
          new ObjectId(id),
      })

    if (!tool) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool not found",
        },
        {
          status: 404,
        }
      )
    }

    // --------------------------------
    // RESPONSE
    // --------------------------------

    return NextResponse.json({
      success: true,
      data: tool,
    })
  } catch (error) {
    console.error(
      "GET TOOL ERROR:",
      error
    )

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
          "Unable to fetch tool",
      },
      {
        status: 500,
      }
    )
  }
}


// ============================================
// PATCH /api/admin/tools/:id
// ============================================

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
    // PARAMS
    // --------------------------------

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
            "Invalid tool ID",
        },
        {
          status: 400,
        }
      )
    }

    const toolId =
      new ObjectId(id)

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const tools =
      getToolCollection(db)

    // --------------------------------
    // FIND EXISTING TOOL
    // --------------------------------

    const existing =
      await tools.findOne({
        _id:
          toolId,
      })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool not found",
        },
        {
          status: 404,
        }
      )
    }

    // --------------------------------
    // FORM DATA
    // --------------------------------

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

    // --------------------------------
    // UPDATE DATA
    // --------------------------------

    const updateData: {
      name?: string
      isActive?: boolean
      image?: string
      updatedAt: Date
    } = {
      updatedAt:
        new Date(),
    }

    // --------------------------------
    // NAME
    // --------------------------------

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
              "Tool name cannot be empty",
          },
          {
            status: 400,
          }
        )
      }

      updateData.name =
        name
    }

    // --------------------------------
    // ACTIVE STATUS
    // --------------------------------

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

    // --------------------------------
    // IMAGE UPDATE
    // --------------------------------

    if (
      image instanceof File
    ) {
      if (image.size === 0) {
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
        await uploadToolImage(
          image
        )

      newImageUrl =
        uploaded.url

      updateData.image =
        uploaded.url
    }

    // --------------------------------
    // UPDATE DATABASE
    // --------------------------------

    await tools.updateOne(
      {
        _id:
          toolId,
      },
      {
        $set:
          updateData,
      }
    )

    // --------------------------------
    // DELETE OLD IMAGE
    // --------------------------------

    if (
      newImageUrl &&
      existing.image &&
      existing.image !==
        newImageUrl
    ) {
      await deleteToolImage(
        existing.image
      )
    }

    // --------------------------------
    // GET UPDATED TOOL
    // --------------------------------

    const updated =
      await tools.findOne({
        _id:
          toolId,
      })

    // --------------------------------
    // AUDIT
    // --------------------------------

    await logAudit({
      userId:
        user._id,

      action:
        "TOOL_UPDATED",

      metadata: {
        resource:
          "tool",

        toolId:
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

    // --------------------------------
    // RESPONSE
    // --------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Tool updated successfully",

      data:
        updated,
    })
  } catch (error) {
    console.error(
      "UPDATE TOOL ERROR:",
      error
    )

    // --------------------------------
    // CLEANUP NEW BLOB
    // --------------------------------
    //
    // If the new image uploaded but
    // MongoDB update failed, remove
    // the newly uploaded Blob.
    // --------------------------------

    if (newImageUrl) {
      await deleteToolImage(
        newImageUrl
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
    // AUTH ERROR
    // --------------------------------

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
          "Unable to update tool",
      },
      {
        status: 500,
      }
    )
  }
}


// ============================================
// DELETE /api/admin/tools/:id
// ============================================

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: Params
) {
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
    // PARAMS
    // --------------------------------

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
            "Invalid tool ID",
        },
        {
          status: 400,
        }
      )
    }

    const toolId =
      new ObjectId(id)

    // --------------------------------
    // DATABASE
    // --------------------------------

    const db =
      await getDb()

    const tools =
      getToolCollection(db)

    // --------------------------------
    // FIND TOOL
    // --------------------------------

    const tool =
      await tools.findOne({
        _id:
          toolId,
      })

    if (!tool) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tool not found",
        },
        {
          status: 404,
        }
      )
    }

    // --------------------------------
    // DELETE DATABASE RECORD
    // --------------------------------

    const deleteResult =
      await tools.deleteOne({
        _id:
          toolId,
      })

    if (
      deleteResult.deletedCount !== 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to delete tool",
        },
        {
          status: 500,
        }
      )
    }

    // --------------------------------
    // DELETE BLOB IMAGE
    // --------------------------------

    if (tool.image) {
      await deleteToolImage(
        tool.image
      )
    }

    // --------------------------------
    // AUDIT
    // --------------------------------

    await logAudit({
      userId:
        user._id,

      action:
        "TOOL_DELETED",

      metadata: {
        resource:
          "tool",

        toolId:
          id,

        name:
          tool.name,

        image:
          tool.image,
      },
    })

    // --------------------------------
    // RESPONSE
    // --------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Tool deleted successfully",
    })
  } catch (error) {
    console.error(
      "DELETE TOOL ERROR:",
      error
    )

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
    // AUTH ERROR
    // --------------------------------

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
          "Unable to delete tool",
      },
      {
        status: 500,
      }
    )
  }
}