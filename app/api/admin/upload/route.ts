import { NextRequest, NextResponse } from "next/server"
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

export const runtime = "nodejs"

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user requesting the upload token
    const user = await authenticate(req)

    // Only admin/manager can upload
    authorize(user, "admin", "manager")

    const body = (await req.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async (pathname) => {
        const extension =
          pathname
            .split(".")
            .pop()
            ?.toLowerCase() || ""

        const allowedExtensions = [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ]

        if (!allowedExtensions.includes(extension)) {
          throw new Error(
            "Only JPG, PNG and WEBP images are allowed"
          )
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,

          maximumSizeInBytes: MAX_SIZE,

          addRandomSuffix: false,

          tokenPayload: JSON.stringify({
            userId: user._id?.toString(),
          }),
        }
      },

      onUploadCompleted: async ({
        blob,
        tokenPayload,
      }) => {
        console.log("BLOB UPLOAD COMPLETED")

        console.log({
          url: blob.url,
          pathname: blob.pathname,
          tokenPayload,
        })
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("BLOB TOKEN ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate upload token",
      },
      {
        status: 500,
      }
    )
  }
}