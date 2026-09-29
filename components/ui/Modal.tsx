"use client"

import {
  ReactNode,
  useEffect,
} from "react"

import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: "sm" | "md" | "lg"
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "sm",
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      )
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: "max-w-[380px]",
    md: "max-w-[500px]",
    lg: "max-w-[700px]",
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/30
        px-4
        backdrop-blur-[2px]

        dark:bg-black/60
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose()
        }
      }}
    >
      <div
        className={`
          w-full
          ${sizes[size]}
          overflow-hidden
          rounded-xl
          border
          border-[#e8e8e8]
          bg-white
          shadow-xl

          dark:border-[#2a2a2a]
          dark:bg-[#171717]
          dark:shadow-black/40
        `}
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-start
            justify-between
            border-b
            border-[#eeeeee]
            px-5
            py-4

            dark:border-[#2a2a2a]
          "
        >
          <div>
            <h2
              className="
                text-[14px]
                font-semibold
                text-[#111]

                dark:text-white
              "
            >
              {title}
            </h2>

            {description && (
              <p
                className="
                  mt-1
                  text-[11px]
                  leading-5
                  text-[#888]

                  dark:text-[#777]
                "
              >
                {description}
              </p>
            )}
          </div>

          {/* CLOSE */}

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-md
              text-[#999]
              transition

              hover:bg-[#f5f5f5]
              hover:text-[#222]

              dark:text-[#777]
              dark:hover:bg-[#242424]
              dark:hover:text-[#ddd]
            "
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* CONTENT */}

        <div
          className="
            px-5
            py-5
            text-[#333]

            dark:text-[#ddd]
          "
        >
          {children}
        </div>
      </div>
    </div>
  )
}