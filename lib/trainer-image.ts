import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { pathToFileURL } from "url"

import sharp from "sharp"
import { put, del } from "@vercel/blob"
import { removeBackground } from "@imgly/background-removal-node"

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function uploadTrainerImage(
  file: File
) {
  if (!file) {
    throw new Error("Trainer image is required")
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

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "trainer-image-"
      )
    )

  const inputPath =
    path.join(
      tempDir,
      "input.png"
    )

  const outputPath =
    path.join(
      tempDir,
      "output.png"
    )

  try {
    /*
     * Convert uploaded image
     * into PNG first.
     */
    const originalBuffer =
      Buffer.from(
        new Uint8Array(
          await file.arrayBuffer()
        )
      )

    await sharp(originalBuffer)
      .png()
      .toFile(inputPath)

    /*
     * IMG.LY works reliably with
     * file:// URLs.
     */
    const inputFileUrl =
      pathToFileURL(inputPath).href

    console.log(
      "[TRAINER BG REMOVE] INPUT:",
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
              `[TRAINER BG REMOVE] ${key}: ${current}/${total}`
            )
          },
        }
      )

    /*
     * IMPORTANT:
     * Explicit Uint8Array conversion
     * avoids SharedArrayBuffer problems
     * with Vercel Blob.
     */
    const removedBuffer =
      Buffer.from(
        new Uint8Array(
          await removedBackground.arrayBuffer()
        )
      )

    /*
     * Resize and optimize.
     */
    const processedBuffer =
      await sharp(removedBuffer)
        .resize(
          1200,
          1200,
          {
            fit: "inside",
            withoutEnlargement: true,
          }
        )
        .png({
          compressionLevel: 9,
          quality: 90,
        })
        .toBuffer()

    /*
     * Final safe Buffer copy.
     */
    const finalBuffer =
      Buffer.from(
        new Uint8Array(
          processedBuffer
        )
      )

    /*
     * Save temporarily if needed
     * for debugging.
     */
    await fs.writeFile(
      outputPath,
      finalBuffer
    )

    const blob =
      await put(
        `trainers/${crypto.randomUUID()}.png`,
        finalBuffer,
        {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: false,
        }
      )

    console.log(
      "[TRAINER IMAGE] Uploaded:",
      blob.url
    )

    return blob.url
  } finally {
    await fs.rm(
      tempDir,
      {
        recursive: true,
        force: true,
      }
    )
  }
}

export async function deleteTrainerImage(
  imageUrl?: string | null
) {
  if (!imageUrl) {
    return
  }

  try {
    await del(imageUrl)

    console.log(
      "[TRAINER IMAGE] Deleted:",
      imageUrl
    )
  } catch (error) {
    console.error(
      "[TRAINER IMAGE DELETE ERROR]",
      error
    )
  }
}