"use client"

import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useState,
} from "react"

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react"

interface AuthInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
  showPasswordToggle?: boolean
}

const AuthInput = forwardRef<
  HTMLInputElement,
  AuthInputProps
>(
  (
    {
      label,
      error,
      leftIcon,
      showPasswordToggle = false,
      type = "text",
      className = "",
      ...props
    },
    ref
  ) => {
    const [
      showPassword,
      setShowPassword,
    ] = useState(false)

    const isPassword =
      type === "password"

    const inputType =
      isPassword && showPassword
        ? "text"
        : type

    const defaultIcon =
      type === "email" ? (
        <Mail
          size={17}
          strokeWidth={1.8}
        />
      ) : isPassword ? (
        <LockKeyhole
          size={17}
          strokeWidth={1.8}
        />
      ) : null

    const hasLeftIcon =
      !!leftIcon || !!defaultIcon

    return (
      <div className="w-full">

        {/* LABEL */}

        {label && (
          <label
            htmlFor={props.id}
            className="
              mb-2
              block
              text-[12px]
              font-medium
              text-[#262626]
              dark:text-[#ddd]
            "
          >
            {label}
          </label>
        )}

        {/* INPUT */}

        <div className="relative">

          {/* LEFT ICON */}

          {hasLeftIcon && (
            <div
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                z-10
                flex
                -translate-y-1/2
                items-center
                justify-center

                text-[#777]
                dark:text-[#777]
              "
            >
              {leftIcon || defaultIcon}
            </div>
          )}

          <input
            ref={ref}
            {...props}
            type={inputType}
            aria-invalid={!!error}
            className={`
              relative
              z-0
              h-[38px]
              w-full
              rounded-lg
              border
              border-[#e5e5e5]
              bg-white
              px-3
              text-[12px]
              text-[#222]
              outline-none
              transition-all

              placeholder:text-[#aaa]

              hover:border-[#d5d5d5]

              focus:border-[#111]
              focus:bg-white
              focus:ring-2
              focus:ring-[#111]/5

              disabled:cursor-not-allowed
              disabled:opacity-60

              /* DARK */

              dark:border-[#333]
              dark:bg-[#202020]
              dark:text-[#eee]

              dark:placeholder:text-[#666]

              dark:hover:border-[#444]

              dark:focus:border-[#666]
              dark:focus:bg-[#222]
              dark:focus:ring-white/5

              ${
                hasLeftIcon
                  ? "pl-9"
                  : ""
              }

              ${
                showPasswordToggle &&
                isPassword
                  ? "pr-10"
                  : ""
              }

              ${
                error
                  ? `
                    border-red-400
                    focus:border-red-400
                    focus:ring-red-400/10

                    dark:border-red-500/70
                    dark:focus:border-red-500
                    dark:focus:ring-red-500/10
                  `
                  : ""
              }

              ${className}
            `}
          />

          {/* PASSWORD TOGGLE */}

          {showPasswordToggle &&
            isPassword && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  z-10
                  flex
                  -translate-y-1/2
                  items-center
                  justify-center

                  text-[#999]

                  transition-colors

                  hover:text-[#555]

                  dark:text-[#777]
                  dark:hover:text-[#bbb]
                "
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={17}
                    strokeWidth={1.8}
                  />
                ) : (
                  <Eye
                    size={17}
                    strokeWidth={1.8}
                  />
                )}
              </button>
            )}
        </div>

        {/* ERROR */}

        {error && (
          <p
            className="
              mt-1.5
              text-[11px]
              text-red-500

              dark:text-red-400
            "
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

AuthInput.displayName = "AuthInput"

export default AuthInput