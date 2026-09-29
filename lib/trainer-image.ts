import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { pathToFileURL } from "url"

import sharp from "sharp"
import { put, del } from "@vercel/blob"

const MAX_FILE_SIZE =
  5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function uploadTrainerImage(
  file: File
) {
  if (!file) {
    throw new Error(
      "Trainer image is required"
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG and WEBP images are allowed"
    )
  }

  if (file.size === 0) {
    throw new Error(
      "Image cannot be empty"
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
    // ======================================
    // DYNAMIC IMPORT
    // ======================================

    const {
      removeBackground,
    } = await import(
      "@imgly/background-removal-node"
    )

    // ======================================
    // READ ORIGINAL IMAGE
    // ======================================

    const originalBuffer =
      Buffer.from(
        new Uint8Array(
          await file.arrayBuffer()
        )
      )

    // ======================================
    // NORMALIZE IMAGE
    // ======================================

    try {
      await sharp(originalBuffer)
        .rotate()
        .png()
        .toFile(inputPath)
    } catch (error) {
      console.error(
        "[TRAINER IMAGE NORMALIZATION ERROR]",
        error
      )

      throw new Error(
        "Invalid or unsupported image"
      )
    }

    // ======================================
    // FILE URL
    // ======================================

    const inputFileUrl =
      pathToFileURL(
        inputPath
      ).href

    console.log(
      "[TRAINER BG REMOVE] INPUT:",
      inputFileUrl
    )

    // ======================================
    // REMOVE BACKGROUND
    // ======================================

    let removedBackground

    try {
      removedBackground =
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
    } catch (error) {
      console.error(
        "[TRAINER BACKGROUND REMOVAL ERROR]",
        error
      )

      throw new Error(
        "Unable to remove image background"
      )
    }

    // ======================================
    // IMG.LY RESULT
    //
    // Make a real Buffer copy.
    // ======================================

    const removedArrayBuffer =
      await removedBackground.arrayBuffer()

    const removedBuffer =
      Buffer.from(
        new Uint8Array(
          removedArrayBuffer
        )
      )

    // ======================================
    // RESIZE + OPTIMIZE
    // ======================================

    let processedBuffer

    try {
      processedBuffer =
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
    } catch (error) {
      console.error(
        "[TRAINER IMAGE PROCESSING ERROR]",
        error
      )

      throw new Error(
        "Unable to process image"
      )
    }

    // ======================================
    // FINAL SAFE BUFFER
    // ======================================

    const finalBuffer =
      Buffer.from(
        new Uint8Array(
          processedBuffer
        )
      )

    console.log(
      "[TRAINER IMAGE] Final size:",
      finalBuffer.length
    )

    // ======================================
    // DEBUG OUTPUT
    // ======================================

    await fs.writeFile(
      outputPath,
      finalBuffer
    )

    // ======================================
    // UPLOAD TO VERCEL BLOB
    // ======================================

    let blob

    try {
      blob =
        await put(
          `trainers/${crypto.randomUUID()}.png`,
          finalBuffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: false,
          }
        )
    } catch (error) {
      console.error(
        "[TRAINER BLOB UPLOAD ERROR]",
        error
      )

      throw new Error(
        "Unable to upload trainer image"
      )
    }

    console.log(
      "[TRAINER IMAGE] Uploaded:",
      blob.url
    )

    return blob.url

  } finally {
    // ======================================
    // CLEAN TEMP DIRECTORY
    // ======================================

    try {
      await fs.rm(
        tempDir,
        {
          recursive: true,
          force: true,
        }
      )
    } catch (error) {
      console.error(
        "[TRAINER TEMP CLEANUP ERROR]",
        error
      )
    }
  }
}


// ==========================================
// DELETE TRAINER IMAGE
// ==========================================

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