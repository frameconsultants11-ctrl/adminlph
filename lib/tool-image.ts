// lib/tool-image.ts

import {
  del,
  put,
} from "@vercel/blob"

import sharp from "sharp"

import crypto from "node:crypto"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  pathToFileURL,
} from "node:url"


// ==========================================
// CONFIG
// ==========================================

const MAX_FILE_SIZE =
  5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]


// ==========================================
// UPLOAD TOOL IMAGE
// ==========================================

export async function uploadToolImage(
  file: File
) {
  // ========================================
  // VALIDATE EMPTY
  // ========================================

  if (!file) {
    throw new Error(
      "Tool image is required"
    )
  }

  if (file.size === 0) {
    throw new Error(
      "Image cannot be empty"
    )
  }


  // ========================================
  // VALIDATE TYPE
  // ========================================

  if (
    !ALLOWED_TYPES.includes(
      file.type
    )
  ) {
    throw new Error(
      "Only JPG, PNG and WEBP images are allowed"
    )
  }


  // ========================================
  // VALIDATE SIZE
  // ========================================

  if (
    file.size > MAX_FILE_SIZE
  ) {
    throw new Error(
      "Image size must be less than 5MB"
    )
  }


  // ========================================
  // READ INPUT
  // ========================================

  const inputBuffer =
    Buffer.from(
      new Uint8Array(
        await file.arrayBuffer()
      )
    )


  // ========================================
  // TEMP DIRECTORY
  // ========================================

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "tool-image-"
      )
    )

  const inputPath =
    path.join(
      tempDir,
      "input.png"
    )


  try {
    // ======================================
    // NORMALIZE IMAGE
    // ======================================

    try {
      await sharp(
        inputBuffer
      )
        .rotate()
        .png()
        .toFile(
          inputPath
        )
    } catch (error) {
      console.error(
        "IMAGE NORMALIZATION ERROR:",
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
      "BACKGROUND INPUT:",
      inputFileUrl
    )


    // ======================================
    // DYNAMIC IMPORT
    //
    // IMPORTANT:
    // Do NOT import this package at the
    // top of the file.
    // ======================================

    let removeBackground

    try {
      const module =
        await import(
          "@imgly/background-removal-node"
        )

      removeBackground =
        module.removeBackground
    } catch (error) {
      console.error(
        "BACKGROUND REMOVAL MODULE ERROR:",
        error
      )

      throw new Error(
        "Unable to load background removal engine"
      )
    }


    // ======================================
    // REMOVE BACKGROUND
    // ======================================

    let result

    try {
      result =
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
                `[BG REMOVE] ${key}: ${current}/${total}`
              )
            },
          }
        )
    } catch (error) {
      console.error(
        "BACKGROUND REMOVAL ERROR:",
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

    const resultArrayBuffer =
      await result.arrayBuffer()

    const resultBuffer =
      Buffer.from(
        new Uint8Array(
          resultArrayBuffer
        )
      )


    // ======================================
    // PROCESS WITH SHARP
    // ======================================

    let processedBuffer

    try {
      processedBuffer =
        await sharp(
          resultBuffer
        )
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
          })
          .toBuffer()
    } catch (error) {
      console.error(
        "IMAGE PROCESSING ERROR:",
        error
      )

      throw new Error(
        "Unable to process image"
      )
    }


    // ======================================
    // FINAL SAFE BUFFER
    // ======================================

    const uploadBuffer =
      Buffer.from(
        new Uint8Array(
          processedBuffer
        )
      )


    console.log(
      "FINAL IMAGE SIZE:",
      uploadBuffer.length
    )


    // ======================================
    // BLOB FILE NAME
    // ======================================

    const fileName =
      `tools/${crypto.randomUUID()}.png`


    // ======================================
    // UPLOAD TO VERCEL BLOB
    // ======================================

    let blob

    try {
      blob =
        await put(
          fileName,
          uploadBuffer,
          {
            access: "public",

            contentType:
              "image/png",

            addRandomSuffix:
              false,
          }
        )
    } catch (error) {
      console.error(
        "BLOB UPLOAD ERROR:",
        error
      )

      throw new Error(
        "Unable to upload tool image"
      )
    }


    // ======================================
    // SUCCESS
    // ======================================

    return {
      url: blob.url,

      pathname:
        blob.pathname,
    }

  } finally {
    // ======================================
    // CLEAN TEMP FILES
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
        "TEMP FILE CLEANUP ERROR:",
        error
      )
    }
  }
}


// ==========================================
// DELETE TOOL IMAGE
// ==========================================

export async function deleteToolImage(
  imageUrl: string
) {
  if (!imageUrl) {
    return
  }

  try {
    await del(
      imageUrl
    )
  } catch (error) {
    console.error(
      "TOOL IMAGE DELETE ERROR:",
      error
    )
  }
}