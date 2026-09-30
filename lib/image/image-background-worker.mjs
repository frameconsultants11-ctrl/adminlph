import fs from "fs/promises"
import path from "path"
import { pathToFileURL } from "url"

const inputPath = process.argv[2]
const outputPath = process.argv[3]
const model = process.argv[4] || "medium"

if (!inputPath || !outputPath) {
  console.error(
    "[IMAGE BG WORKER] Missing input/output path"
  )

  process.exit(1)
}

try {
  console.log(
    "[IMAGE BG WORKER] Starting"
  )

  console.log(
    "[IMAGE BG WORKER] Input:",
    inputPath
  )

  console.log(
    "[IMAGE BG WORKER] Output:",
    outputPath
  )

  console.log(
    "[IMAGE BG WORKER] Model:",
    model
  )

  // ==========================================
  // DYNAMIC IMPORT
  // ==========================================

  const {
    removeBackground,
  } = await import(
    "@imgly/background-removal-node"
  )

  // ==========================================
  // FILE URL
  // ==========================================

  const inputUrl =
    pathToFileURL(
      path.resolve(inputPath)
    ).href

  console.log(
    "[IMAGE BG WORKER] Input URL:",
    inputUrl
  )

  // ==========================================
  // REMOVE BACKGROUND
  // ==========================================

  const result =
    await removeBackground(
      inputUrl,
      {
        model,

        output: {
          format: "image/png",
          quality: 0.9,
        },

        progress(
          key,
          current,
          total
        ) {
          console.log(
            `[IMAGE BG WORKER] ${key}: ${current}/${total}`
          )
        },
      }
    )

  // ==========================================
  // RESULT
  // ==========================================

  const arrayBuffer =
    await result.arrayBuffer()

  const buffer =
    Buffer.from(
      new Uint8Array(
        arrayBuffer
      )
    )

  if (!buffer.length) {
    throw new Error(
      "Background removal returned an empty image"
    )
  }

  // ==========================================
  // WRITE OUTPUT
  // ==========================================

  await fs.writeFile(
    outputPath,
    buffer
  )

  console.log(
    "[IMAGE BG WORKER] Output size:",
    buffer.length
  )

  console.log(
    "[IMAGE BG WORKER] Completed successfully"
  )

  process.exit(0)

} catch (error) {
  console.error(
    "[IMAGE BG WORKER ERROR]"
  )

  console.error(
    error
  )

  process.exit(1)
}