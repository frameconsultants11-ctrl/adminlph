import crypto from "crypto"
import fs from "fs/promises"
import os from "os"
import path from "path"

import sharp from "sharp"
import {
  put,
  del,
} from "@vercel/blob"

import {
  removeBackgroundInProcess,
} from "./image-background-process"


// =====================================================
// TYPES
// =====================================================

export type ImageOutputFormat =
  | "png"
  | "webp"
  | "jpeg"

export type UploadImageOptions = {
  /**
   * Vercel Blob folder.
   *
   * Example:
   *
   * "trainers"
   * "courses"
   * "events"
   * "blog"
   */
  folder?: string

  /**
   * Remove image background.
   *
   * Default: false
   */
  removeBackground?: boolean

  /**
   * IMG.LY model.
   *
   * Default: medium
   */
  backgroundModel?:
    | "small"
    | "medium"

  /**
   * Maximum input file size.
   *
   * Default: 5MB
   */
  maxFileSize?: number

  /**
   * Maximum width.
   *
   * Default: 1200
   */
  maxWidth?: number

  /**
   * Maximum height.
   *
   * Default: 1200
   */
  maxHeight?: number

  /**
   * Output format.
   *
   * Default:
   *
   * png when removing background
   * webp otherwise
   */
  format?: ImageOutputFormat

  /**
   * Image quality.
   *
   * Default: 90
   */
  quality?: number

  /**
   * Compression level for PNG.
   *
   * 0 - 9
   *
   * Default: 9
   */
  compressionLevel?: number

  /**
   * Background removal timeout.
   *
   * Default: 120 seconds.
   */
  backgroundTimeout?: number

  /**
   * Delete previous image
   * after the new image has uploaded.
   */
  oldImageUrl?: string | null

  /**
   * Optional custom filename.
   *
   * Example:
   *
   * "profile"
   *
   * Final name:
   *
   * profile-uuid.png
   */
  filename?: string

  /**
   * Allow only these input types.
   *
   * Default:
   *
   * jpeg
   * png
   * webp
   */
  allowedTypes?: string[]
}

export type UploadImageResult = {
  url: string
  size: number
  format: ImageOutputFormat
}


// =====================================================
// CONSTANTS
// =====================================================

const DEFAULT_MAX_FILE_SIZE =
  5 * 1024 * 1024

const DEFAULT_MAX_WIDTH =
  1200

const DEFAULT_MAX_HEIGHT =
  1200

const DEFAULT_QUALITY =
  90

const DEFAULT_COMPRESSION_LEVEL =
  9

const DEFAULT_BACKGROUND_TIMEOUT =
  120_000

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]


// =====================================================
// HELPERS
// =====================================================

function getExtension(
  format: ImageOutputFormat
) {
  switch (format) {
    case "jpeg":
      return "jpg"

    case "webp":
      return "webp"

    case "png":
    default:
      return "png"
  }
}


function getContentType(
  format: ImageOutputFormat
) {
  switch (format) {
    case "jpeg":
      return "image/jpeg"

    case "webp":
      return "image/webp"

    case "png":
    default:
      return "image/png"
  }
}


function sanitizeFolder(
  folder?: string
) {
  if (!folder) {
    return "images"
  }

  return folder
    .trim()
    .replace(
      /^\/+/,
      ""
    )
    .replace(
      /\/+$/,
      ""
    )
    .replace(
      /[^a-zA-Z0-9/_-]/g,
      ""
    ) || "images"
}


function sanitizeFilename(
  filename?: string
) {
  if (!filename) {
    return "image"
  }

  return (
    filename
      .trim()
      .replace(
        /\.[^/.]+$/,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .slice(
        0,
        100
      ) ||
    "image"
  )
}


// =====================================================
// MAIN UPLOAD FUNCTION
// =====================================================

export async function uploadImage(
  file: File,
  options: UploadImageOptions = {}
): Promise<UploadImageResult> {

  // ===================================================
  // OPTIONS
  // ===================================================

  const {
    folder = "images",

    removeBackground = false,

    backgroundModel =
      "medium",

    maxFileSize =
      DEFAULT_MAX_FILE_SIZE,

    maxWidth =
      DEFAULT_MAX_WIDTH,

    maxHeight =
      DEFAULT_MAX_HEIGHT,

    quality =
      DEFAULT_QUALITY,

    compressionLevel =
      DEFAULT_COMPRESSION_LEVEL,

    backgroundTimeout =
      DEFAULT_BACKGROUND_TIMEOUT,

    oldImageUrl = null,

    filename,

    allowedTypes =
      DEFAULT_ALLOWED_TYPES,
  } = options


  // ===================================================
  // VALIDATE FILE
  // ===================================================

  if (!file) {
    throw new Error(
      "Image file is required"
    )
  }


  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    throw new Error(
      `Unsupported image type: ${file.type}`
    )
  }


  if (
    file.size <= 0
  ) {
    throw new Error(
      "Image cannot be empty"
    )
  }


  if (
    file.size >
    maxFileSize
  ) {
    throw new Error(
      `Image size must be less than ${Math.round(
        maxFileSize /
          1024 /
          1024
      )}MB`
    )
  }


  // ===================================================
  // FORMAT
  // ===================================================

  const outputFormat =
    removeBackground
      ? "png"
      : (
          options.format ??
          "webp"
        )


  // ===================================================
  // TEMP DIRECTORY
  // ===================================================

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "image-upload-"
      )
    )


  const inputPath =
    path.join(
      tempDir,
      "input.png"
    )


  const backgroundRemovedPath =
    path.join(
      tempDir,
      "background-removed.png"
    )


  const outputPath =
    path.join(
      tempDir,
      `output.${getExtension(
        outputFormat
      )}`
    )


  try {

    // =================================================
    // READ FILE
    // =================================================

    const originalBuffer =
      Buffer.from(
        new Uint8Array(
          await file.arrayBuffer()
        )
      )


    // =================================================
    // NORMALIZE
    //
    // JPEG / PNG / WEBP
    //       ↓
    // normalized PNG
    // =================================================

    try {

      await sharp(
        originalBuffer
      )
        .rotate()
        .png()
        .toFile(
          inputPath
        )

    } catch (error) {

      console.error(
        "[IMAGE NORMALIZATION ERROR]",
        error
      )

      throw new Error(
        "Invalid or unsupported image"
      )
    }


    console.log(
      "[IMAGE] Normalized:",
      inputPath
    )


    // =================================================
    // BACKGROUND REMOVAL
    // =================================================

    let processingBuffer:
      Buffer


    if (
      removeBackground
    ) {

      console.log(
        "[IMAGE] Background removal started"
      )

      console.log(
        "[IMAGE] Model:",
        backgroundModel
      )

      try {

        await removeBackgroundInProcess(
          inputPath,
          backgroundRemovedPath,
          {
            timeout:
              backgroundTimeout,

            model:
              backgroundModel,
          }
        )

      } catch (error) {

        console.error(
          "[IMAGE BACKGROUND REMOVAL ERROR]",
          error
        )

        throw new Error(
          "Unable to remove image background"
        )
      }


      // =============================================
      // READ BACKGROUND REMOVED IMAGE
      // =============================================

      try {

        processingBuffer =
          await fs.readFile(
            backgroundRemovedPath
          )

      } catch (error) {

        console.error(
          "[IMAGE BACKGROUND OUTPUT ERROR]",
          error
        )

        throw new Error(
          "Background removal produced no image"
        )
      }


      if (
        !processingBuffer.length
      ) {
        throw new Error(
          "Background removal produced an empty image"
        )
      }

    } else {

      processingBuffer =
        originalBuffer
    }


    // =================================================
    // RESIZE
    // =================================================

    let image =
      sharp(
        processingBuffer
      )
        .rotate()
        .resize(
          maxWidth,
          maxHeight,
          {
            fit: "inside",
            withoutEnlargement: true,
          }
        )


    // =================================================
    // OUTPUT FORMAT
    // =================================================

    switch (
      outputFormat
    ) {

      case "png":

        image =
          image.png({
            compressionLevel,
            quality,
          })

        break


      case "webp":

        image =
          image.webp({
            quality,
          })

        break


      case "jpeg":

        image =
          image.jpeg({
            quality,
            mozjpeg: true,
          })

        break
    }


    // =================================================
    // PROCESS
    // =================================================

    let finalBuffer:
      Buffer

    try {

      finalBuffer =
        await image.toBuffer()

    } catch (error) {

      console.error(
        "[IMAGE PROCESSING ERROR]",
        error
      )

      throw new Error(
        "Unable to process image"
      )
    }


    if (
      !finalBuffer.length
    ) {
      throw new Error(
        "Processed image is empty"
      )
    }


    // =================================================
    // WRITE DEBUG OUTPUT
    // =================================================

    await fs.writeFile(
      outputPath,
      finalBuffer
    )


    console.log(
      "[IMAGE] Final size:",
      finalBuffer.length
    )


    // =================================================
    // BLOB PATH
    // =================================================

    const safeFolder =
      sanitizeFolder(
        folder
      )

    const safeFilename =
      sanitizeFilename(
        filename
      )

    const extension =
      getExtension(
        outputFormat
      )

    const blobPath =
      `${safeFolder}/${safeFilename}-${crypto.randomUUID()}.${extension}`


    // =================================================
    // UPLOAD
    // =================================================

    let blob

    try {

      blob =
        await put(
          blobPath,
          finalBuffer,
          {
            access: "public",

            contentType:
              getContentType(
                outputFormat
              ),

            addRandomSuffix:
              false,
          }
        )

    } catch (error) {

      console.error(
        "[IMAGE BLOB UPLOAD ERROR]",
        error
      )

      throw new Error(
        "Unable to upload image"
      )
    }


    console.log(
      "[IMAGE] Uploaded:",
      blob.url
    )


    // =================================================
    // DELETE OLD IMAGE
    //
    // Only after the new image succeeds.
    // =================================================

    if (
      oldImageUrl
    ) {

      try {

        await deleteImage(
          oldImageUrl
        )

      } catch (error) {

        console.error(
          "[IMAGE OLD FILE DELETE ERROR]",
          error
        )

        // Don't fail the upload
        // because old image deletion failed.
      }
    }


    // =================================================
    // RETURN
    // =================================================

    return {
      url:
        blob.url,

      size:
        finalBuffer.length,

      format:
        outputFormat,
    }

  } finally {

    // =================================================
    // CLEAN TEMP DIRECTORY
    // =================================================

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
        "[IMAGE TEMP CLEANUP ERROR]",
        error
      )
    }
  }
}


// =====================================================
// DELETE IMAGE
// =====================================================

export async function deleteImage(
  imageUrl?: string | null
) {

  if (!imageUrl) {
    return
  }


  try {

    await del(
      imageUrl
    )

    console.log(
      "[IMAGE] Deleted:",
      imageUrl
    )

  } catch (error) {

    console.error(
      "[IMAGE DELETE ERROR]",
      error
    )

    throw error
  }
}