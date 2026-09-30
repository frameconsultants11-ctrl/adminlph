import {
  NextRequest,
  NextResponse,
} from "next/server"

import { del } from "@vercel/blob"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import { requireCsrf } from "@/lib/csrf"

export const runtime = "nodejs"

export async function DELETE(
  req: NextRequest
) {
  try {
    const user =
      await authenticate(req)

    authorize(
      user,
      "admin",
      "manager"
    )

    requireCsrf(req)

    const body =
      await req.json()

    const url = body?.url

    if (
      typeof url !== "string" ||
      !url.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Blob URL is required",
        },
        {
          status: 400,
        }
      )
    }

    /*
     * Only allow deleting Vercel Blob
     * URLs belonging to our Blob store.
     */

    if (
      !url.includes(
        ".blob.vercel-storage.com/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Blob URL",
        },
        {
          status: 400,
        }
      )
    }

    await del(url)

    return NextResponse.json({
      success: true,
      message:
        "Image deleted successfully",
    })
  } catch (error) {
    console.error(
      "BLOB DELETE ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete image"

    if (
      message ===
      "Authentication required"
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