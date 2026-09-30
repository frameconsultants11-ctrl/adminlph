import {
  spawn,
  type ChildProcess,
} from "child_process"

import path from "path"

export type BackgroundRemovalOptions = {
  timeout?: number
  model?: "small" | "medium"
}

const DEFAULT_TIMEOUT =
  120_000

function killProcess(
  child: ChildProcess
) {
  try {
    if (!child.killed) {
      child.kill("SIGTERM")
    }
  } catch {
    // Ignore
  }

  setTimeout(() => {
    try {
      if (
        child.pid &&
        !child.killed
      ) {
        child.kill("SIGKILL")
      }
    } catch {
      // Ignore
    }
  }, 5_000)
}

export function removeBackgroundInProcess(
  inputPath: string,
  outputPath: string,
  options: BackgroundRemovalOptions = {}
): Promise<void> {
  const timeout =
    options.timeout ??
    DEFAULT_TIMEOUT

  const model =
    options.model ??
    "medium"

  return new Promise(
    (resolve, reject) => {
      let finished = false

      let timer:
        | NodeJS.Timeout
        | undefined

      let stdout = ""
      let stderr = ""

      const finishSuccess =
        () => {
          if (finished) {
            return
          }

          finished = true

          if (timer) {
            clearTimeout(timer)
          }

          resolve()
        }

      const finishError =
        (
          error: Error
        ) => {
          if (finished) {
            return
          }

          finished = true

          if (timer) {
            clearTimeout(timer)
          }

          reject(error)
        }

      // ======================================
      // WORKER PATH
      // ======================================

      const workerPath =
        path.join(
          process.cwd(),
          "lib",
          "image",
          "image-background-worker.mjs"
        )

      // ======================================
      // IMPORTANT
      //
      // If your project does NOT use src/,
      // change this to:
      //
      // path.join(
      //   process.cwd(),
      //   "lib",
      //   "image",
      //   "image-background-worker.mjs"
      // )
      // ======================================

      console.log(
        "[IMAGE BG PROCESS] Worker:",
        workerPath
      )

      console.log(
        "[IMAGE BG PROCESS] Input:",
        inputPath
      )

      console.log(
        "[IMAGE BG PROCESS] Output:",
        outputPath
      )

      console.log(
        "[IMAGE BG PROCESS] Model:",
        model
      )

      // ======================================
      // SPAWN
      // ======================================

      let child: ChildProcess

      try {
        child =
          spawn(
            process.execPath,
            [
              workerPath,
              inputPath,
              outputPath,
              model,
            ],
            {
              cwd:
                process.cwd(),

              stdio: [
                "ignore",
                "pipe",
                "pipe",
              ],

              env: {
                ...process.env,
              },
            }
          )
      } catch (error) {
        finishError(
          error instanceof Error
            ? error
            : new Error(
                "Unable to start image worker"
              )
        )

        return
      }

      // ======================================
      // STDOUT
      // ======================================

      child.stdout?.on(
        "data",
        (data) => {
          const message =
            data.toString()

          stdout += message

          console.log(
            message.trim()
          )
        }
      )

      // ======================================
      // STDERR
      // ======================================

      child.stderr?.on(
        "data",
        (data) => {
          const message =
            data.toString()

          stderr += message

          console.error(
            message.trim()
          )
        }
      )

      // ======================================
      // PROCESS ERROR
      // ======================================

      child.on(
        "error",
        (error) => {
          console.error(
            "[IMAGE BG PROCESS ERROR]",
            error
          )

          finishError(
            new Error(
              "Unable to start image background removal worker"
            )
          )
        }
      )

      // ======================================
      // PROCESS EXIT
      // ======================================

      child.on(
        "exit",
        (
          code,
          signal
        ) => {
          console.log(
            "[IMAGE BG PROCESS] Exit",
            {
              code,
              signal,
            }
          )

          if (
            code === 0
          ) {
            finishSuccess()
            return
          }

          const logs =
            [
              stderr.trim(),
              stdout.trim(),
            ]
              .filter(Boolean)
              .join("\n")

          const reason =
            signal
              ? `terminated by signal ${signal}`
              : `exited with code ${code}`

          finishError(
            new Error(
              `Image background removal worker ${reason}${
                logs
                  ? `\n${logs.slice(-3000)}`
                  : ""
              }`
            )
          )
        }
      )

      // ======================================
      // TIMEOUT
      // ======================================

      timer =
        setTimeout(
          () => {
            console.error(
              "[IMAGE BG PROCESS] Timeout"
            )

            killProcess(
              child
            )

            finishError(
              new Error(
                `Image background removal timed out after ${timeout}ms`
              )
            )
          },
          timeout
        )
    }
  )
}