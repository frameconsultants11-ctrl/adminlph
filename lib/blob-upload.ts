"use client"

import { upload } from "@vercel/blob/client"

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function uploadImage(
  file: File,
  folder = "images"
) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG and WEBP images are allowed"
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Image size must be less than 5MB"
    )
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "png"

  const pathname =
    `${folder}/${crypto.randomUUID()}.${extension}`

  console.log("Uploading to Blob:", pathname)

  const blob = await upload(
    pathname,
    file,
    {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      multipart: true,
    }
  )

  console.log("Blob uploaded:", blob.url)

  return blob
}