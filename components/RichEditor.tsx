"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import { upload } from "@vercel/blob/client"

import { apiFetch } from "@/lib/api-fetch"

/* =========================================================
   TYPES
========================================================= */

export type EditorBlock = {
  id?: string
  type: string
  data: Record<string, unknown>
}

export type EditorData = {
  time?: number
  version?: string
  blocks: EditorBlock[]
}

export type RichEditorHandle = {
  save: () => Promise<EditorData>
}

type RichEditorProps = {
  initialData?: EditorData
  placeholder?: string
  onReady?: () => void
}

type EditorInstance = {
  isReady: Promise<void>
  save: () => Promise<EditorData>
  destroy: () => void
}

/* =========================================================
   IMAGE UPLOAD
========================================================= */

/**
 * Upload an Editor.js image directly to Vercel Blob.
 *
 * This uses the same /api/admin/upload endpoint
 * as the CourseForm thumbnail upload.
 */
async function uploadByFile(
  file: File
) {
  if (!file) {
    return {
      success: 0,
      message: "No image selected",
    }
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ]

  if (!allowedTypes.includes(file.type)) {
    return {
      success: 0,
      message:
        "Only JPG, PNG and WEBP images are allowed",
    }
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {
    return {
      success: 0,
      message:
        "Image size must be less than 5MB",
    }
  }

  try {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "png"

    const pathname =
      `courses/editor/${crypto.randomUUID()}.${extension}`

    const blob = await upload(
      pathname,
      file,
      {
        access: "public",

        handleUploadUrl:
          "/api/admin/upload",

        multipart: true,
      }
    )

    return {
      success: 1,
      file: {
        url: blob.url,
      },
    }
  } catch (error) {
    console.error(
      "EDITOR IMAGE UPLOAD ERROR:",
      error
    )

    return {
      success: 0,
      message:
        error instanceof Error
          ? error.message
          : "Image upload failed",
    }
  }
}

/**
 * Upload an image from URL.
 *
 * The actual fetch happens on the server.
 * The server then stores the image in Vercel Blob.
 */
async function uploadByUrl(
  url: string
) {
  if (!url?.trim()) {
    return {
      success: 0,
      message: "Image URL is required",
    }
  }

  try {
    const response =
      await apiFetch(
        "/api/admin/editor/fetch-image",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            url: url.trim(),
          }),
        }
      )

    const data =
      await response
        .json()
        .catch(() => null)

    if (!response.ok) {
      return {
        success: 0,
        message:
          data?.message ||
          "Unable to upload image from URL",
      }
    }

    /*
     * Expected response:
     *
     * {
     *   success: 1,
     *   file: {
     *     url: "https://....blob.vercel-storage.com/..."
     *   }
     * }
     */

    return data
  } catch (error) {
    console.error(
      "EDITOR URL IMAGE ERROR:",
      error
    )

    return {
      success: 0,
      message:
        error instanceof Error
          ? error.message
          : "Unable to upload image",
    }
  }
}

/* =========================================================
   EDITOR
========================================================= */

const RichEditor = forwardRef<
  RichEditorHandle,
  RichEditorProps
>(
  function RichEditor(
    {
      initialData,
      placeholder = "Write detailed course content...",
      onReady,
    },
    ref
  ) {
    const holderRef =
      useRef<HTMLDivElement | null>(
        null
      )

    const editorRef =
      useRef<EditorInstance | null>(
        null
      )

    /*
     * Keep latest props without
     * restarting Editor.js.
     */

    const initialDataRef =
      useRef(initialData)

    const onReadyRef =
      useRef(onReady)

    const placeholderRef =
      useRef(placeholder)

    const [ready, setReady] =
      useState(false)

    const [error, setError] =
      useState("")

    /* =======================================================
       KEEP REFS UPDATED
    ======================================================= */

    useEffect(() => {
      initialDataRef.current =
        initialData
    }, [initialData])

    useEffect(() => {
      onReadyRef.current =
        onReady
    }, [onReady])

    useEffect(() => {
      placeholderRef.current =
        placeholder
    }, [placeholder])

    /* =======================================================
       EXPOSE SAVE()
    ======================================================= */

    useImperativeHandle(
      ref,
      () => ({
        async save() {
          const editor =
            editorRef.current

          if (!editor) {
            return {
              blocks: [],
            }
          }

          await editor.isReady

          return editor.save()
        },
      }),
      []
    )

    /* =======================================================
       INIT EDITOR
    ======================================================= */

    useEffect(() => {
      const holder =
        holderRef.current

      if (!holder) {
        return
      }

      let cancelled = false

      let editor:
        | EditorInstance
        | null = null

      /*
       * Create a fresh DOM node.
       *
       * This prevents React Strict Mode
       * from leaving multiple Editor.js
       * instances attached to the same node.
       */

      const el =
        document.createElement(
          "div"
        )

      holder.appendChild(el)

      async function init() {
        try {
          setError("")
          setReady(false)

          /* -------------------------------------------------
             LOAD EDITOR.JS + TOOLS
          ------------------------------------------------- */

          const [
            EditorJSModule,
            HeaderModule,
            ListModule,
            ChecklistModule,
            QuoteModule,
            WarningModule,
            DelimiterModule,
            TableModule,
            CodeModule,
            EmbedModule,
            ImageModule,
            LinkModule,
            RawModule,
            MarkerModule,
            InlineCodeModule,
          ] = await Promise.all([
            import(
              "@editorjs/editorjs"
            ),

            import(
              "@editorjs/header"
            ),

            import(
              "@editorjs/list"
            ),

            import(
              "@editorjs/checklist"
            ),

            import(
              "@editorjs/quote"
            ),

            import(
              "@editorjs/warning"
            ),

            import(
              "@editorjs/delimiter"
            ),

            import(
              "@editorjs/table"
            ),

            import(
              "@editorjs/code"
            ),

            import(
              "@editorjs/embed"
            ),

            import(
              "@editorjs/image"
            ),

            import(
              "@editorjs/link"
            ),

            import(
              "@editorjs/raw"
            ),

            import(
              "@editorjs/marker"
            ),

            import(
              "@editorjs/inline-code"
            ),
          ])

          if (cancelled) {
            return
          }

          const EditorJS =
            EditorJSModule.default

          /* -------------------------------------------------
             EDITOR CONFIG
          ------------------------------------------------- */

          const instance =
            new EditorJS({
              holder: el,

              placeholder:
                placeholderRef.current,

              autofocus: false,

              minHeight: 300,

              data: initialDataRef
                .current?.blocks
                ? {
                    time:
                      initialDataRef
                        .current
                        .time,

                    version:
                      initialDataRef
                        .current
                        .version,

                    blocks:
                      initialDataRef
                        .current
                        .blocks,
                  }
                : {
                    blocks: [],
                  },

              /* -------------------------------------------------
                 TOOLS
              ------------------------------------------------- */

              tools: {
                /* ---------------------------------------------
                   PARAGRAPH
                --------------------------------------------- */

                paragraph: {
                  inlineToolbar:
                    true,
                },

                /* ---------------------------------------------
                   HEADER
                --------------------------------------------- */

                header: {
                  class:
                    HeaderModule.default,

                  inlineToolbar:
                    true,

                  config: {
                    levels: [
                      2,
                      3,
                      4,
                    ],

                    defaultLevel: 2,

                    placeholder:
                      "Enter heading...",
                  },
                },

                /* ---------------------------------------------
                   LIST
                --------------------------------------------- */

                list: {
                  class:
                    ListModule.default,

                  inlineToolbar:
                    true,
                },

                /* ---------------------------------------------
                   CHECKLIST
                --------------------------------------------- */

                checklist: {
                  class:
                    ChecklistModule.default,

                  inlineToolbar:
                    true,
                },

                /* ---------------------------------------------
                   QUOTE
                --------------------------------------------- */

                quote: {
                  class:
                    QuoteModule.default,

                  inlineToolbar:
                    true,

                  config: {
                    quotePlaceholder:
                      "Enter quote...",

                    captionPlaceholder:
                      "Quote author...",
                  },
                },

                /* ---------------------------------------------
                   WARNING
                --------------------------------------------- */

                warning: {
                  class:
                    WarningModule.default,

                  inlineToolbar:
                    true,
                },

                /* ---------------------------------------------
                   DELIMITER
                --------------------------------------------- */

                delimiter: {
                  class:
                    DelimiterModule.default,
                },

                /* ---------------------------------------------
                   TABLE
                --------------------------------------------- */

                table: {
                  class:
                    TableModule.default,

                  inlineToolbar:
                    true,
                },

                /* ---------------------------------------------
                   CODE
                --------------------------------------------- */

                code: {
                  class:
                    CodeModule.default,
                },

                /* ---------------------------------------------
                   EMBED
                --------------------------------------------- */

                embed: {
                  class:
                    EmbedModule.default,

                  config: {
                    services: {
                      youtube: true,
                      vimeo: true,
                    },
                  },
                },

                /* ---------------------------------------------
                   IMAGE
                --------------------------------------------- */

                image: {
                  class:
                    ImageModule.default,

                  config: {
                    uploader: {
                      uploadByFile,
                      uploadByUrl,
                    },
                  },
                },

                /* ---------------------------------------------
                   LINK TOOL
                --------------------------------------------- */

                linkTool: {
                  class:
                    LinkModule.default,

                  config: {
                    endpoint:
                      "/api/admin/editor/link-preview",
                  },
                },

                /* ---------------------------------------------
                   RAW HTML
                --------------------------------------------- */

                raw: {
                  class:
                    RawModule.default,
                },

                /* ---------------------------------------------
                   MARKER
                --------------------------------------------- */

                marker: {
                  class:
                    MarkerModule.default,
                },

                /* ---------------------------------------------
                   INLINE CODE
                --------------------------------------------- */

                inlineCode: {
                  class:
                    InlineCodeModule.default,
                },
              },

              /* -------------------------------------------------
                 INLINE TOOLBAR
              ------------------------------------------------- */

              inlineToolbar: [
                "bold",
                "italic",
                "link",
                "marker",
                "inlineCode",
              ],
            }) as unknown as EditorInstance

          editor =
            instance

          /* -------------------------------------------------
             WAIT UNTIL READY
          ------------------------------------------------- */

          await instance.isReady

          if (cancelled) {
            try {
              instance.destroy()
            } catch {
              // Ignore destroy error
            }

            return
          }

          editorRef.current =
            instance

          setReady(true)

          onReadyRef.current?.()
        } catch (err) {
          console.error(
            "EDITORJS INIT ERROR:",
            err
          )

          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Editor failed to load"
            )

            setReady(false)
          }
        }
      }

      init()

      /* =====================================================
         CLEANUP
      ===================================================== */

      return () => {
        cancelled = true

        editorRef.current =
          null

        const instance =
          editor

        editor = null

        if (instance) {
          instance.isReady
            .then(() => {
              try {
                instance.destroy()
              } catch {
                // Ignore Editor.js cleanup error
              }
            })
            .catch(() => {})
            .finally(() => {
              el.remove()
            })
        } else {
          el.remove()
        }
      }
    }, [])

    /* =========================================================
       UI
    ========================================================= */

    return (
      <div>
        {/* HEADER */}

        <div className="border-b border-[#eee] bg-[#fafafa] px-4 py-2 dark:border-[#333] dark:bg-[#181818]">

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#888] dark:text-[#777]">

            <span>
              Editor
            </span>

            {ready && (
              <span className="rounded-full bg-[#67e44e]/10 px-2 py-0.5 text-[#4fbd3d] dark:text-[#67e44e]">
                Ready
              </span>
            )}

          </div>

        </div>

        {/* EDITOR */}

        <div
          ref={holderRef}
          className="course-editor min-h-[350px] px-4 py-3 text-[#222] dark:text-white"
        />

        {/* LOADING */}

        {!ready &&
          !error && (
            <p className="px-4 pb-3 text-[10px] text-[#999] dark:text-[#777]">
              Loading editor...
            </p>
          )}

        {/* ERROR */}

        {error && (
          <p className="px-4 pb-3 text-[10px] text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

RichEditor.displayName =
  "RichEditor"

export default RichEditor