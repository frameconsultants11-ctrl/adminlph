import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { pathToFileURL } from "url"

import sharp from "sharp"
import { put, del } from "@vercel/blob"
import {
  removeBackground,
} from "@imgly/background-removal-node"

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function uploadCertificationImage(
  file: File
): Promise<string> {
  if (!file) {
    throw new Error(
      "Certification image is required"
    )
  }

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

  const tempDir = await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      "certification-image-"
    )
  )

  const inputPath = path.join(
    tempDir,
    "input.png"
  )

  try {
    const originalBuffer = Buffer.from(
      new Uint8Array(
        await file.arrayBuffer()
      )
    )

    // Normalize input to PNG
    await sharp(originalBuffer)
      .png()
      .toFile(inputPath)

    const inputFileUrl =
      pathToFileURL(inputPath).href

    console.log(
      "[CERTIFICATION BG REMOVE] INPUT:",
      inputFileUrl
    )

    const removedBackground =
      await removeBackground(
        inputFileUrl,
        {
          model: "medium",

          output: {
            format: "image/png",
            quality: 0.9,
          },

          progress: (
            key,
            current,
            total
          ) => {
            console.log(
              `[CERTIFICATION BG REMOVE] ${key}: ${current}/${total}`
            )
          },
        }
      )

    const removedBuffer =
      Buffer.from(
        new Uint8Array(
          await removedBackground.arrayBuffer()
        )
      )

    const processedBuffer =
      await sharp(removedBuffer)
        .resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({
          compressionLevel: 9,
          quality: 90,
        })
        .toBuffer()

    // Important:
    // Create a normal Buffer copy before Vercel Blob
    const finalBuffer =
      Buffer.from(
        new Uint8Array(
          processedBuffer
        )
      )

    const blob = await put(
      `certifications/${crypto.randomUUID()}.png`,
      finalBuffer,
      {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      }
    )

    console.log(
      "[CERTIFICATION IMAGE] Uploaded:",
      blob.url
    )

    return blob.url
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
    })
  }
}

export async function deleteCertificationImage(
  imageUrl?: string | null
) {
  if (!imageUrl) {
    return
  }

  try {
    await del(imageUrl)

    console.log(
      "[CERTIFICATION IMAGE] Deleted:",
      imageUrl
    )
  } catch (error) {
    console.error(
      "[CERTIFICATION IMAGE DELETE ERROR]",
      error
    )
  }
}