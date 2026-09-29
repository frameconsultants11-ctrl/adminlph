// lib/skill-image.ts

import {
  del,
  put,
} from "@vercel/blob"

import {
  removeBackground,
} from "@imgly/background-removal-node"

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
// UPLOAD SKILL IMAGE
// ==========================================

export async function uploadSkillImage(
  file: File
) {

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
  // VALIDATE EMPTY
  // ========================================

  if (file.size === 0) {
    throw new Error(
      "Image cannot be empty"
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
  // FILE -> BUFFER
  // ========================================

  const inputBuffer =
    Buffer.from(
      await file.arrayBuffer()
    )


  // ========================================
  // TEMP DIRECTORY
  // ========================================

  const tempDir =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "skill-image-"
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
        "SKILL IMAGE NORMALIZATION ERROR:",
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
      "SKILL BACKGROUND INPUT:",
      inputFileUrl
    )


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
                `[SKILL BG REMOVE] ${key}: ${current}/${total}`
              )

            },
          }
        )

    } catch (error) {

      console.error(
        "SKILL BACKGROUND REMOVAL ERROR:",
        error
      )

      throw new Error(
        "Unable to remove image background"
      )
    }


    // ======================================
    // IMG.LY RESULT
    //
    // Explicit Uint8Array copy prevents
    // SharedArrayBuffer issues.
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
    // PROCESS RESULT
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
        "SKILL IMAGE PROCESSING ERROR:",
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
      "SKILL FINAL IMAGE SIZE:",
      uploadBuffer.length
    )


    // ======================================
    // BLOB FILE NAME
    // ======================================

    const fileName =
      `skills/${crypto.randomUUID()}.png`


    // ======================================
    // UPLOAD
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
        "SKILL BLOB UPLOAD ERROR:",
        error
      )

      throw new Error(
        "Unable to upload skill image"
      )
    }


    // ======================================
    // RETURN
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
        "SKILL TEMP CLEANUP ERROR:",
        error
      )
    }
  }
}


// ==========================================
// DELETE SKILL IMAGE
// ==========================================

export async function deleteSkillImage(
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
      "SKILL IMAGE DELETE ERROR:",
      error
    )
  }
}