"use client"

import {
  ButtonHTMLAttributes,
  ReactNode,
} from "react"

import { Loader2 } from "lucide-react"

interface AuthButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
  loadingText?: string

  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"

  size?:
    | "sm"
    | "md"
    | "lg"

  fullWidth?: boolean
}

export default function AuthButton({
  loading = false,
  children,
  loadingText = "Please wait...",
  disabled,
  className = "",

  variant = "primary",
  size = "md",
  fullWidth = true,

  ...props
}: AuthButtonProps) {
  const variants = {
    primary: `
      bg-[#14970d]
      text-white
      hover:bg-[#1bb313]
    `,

    secondary: `
      bg-[#111]
      text-white
      hover:bg-[#222]
    `,

    outline: `
      border
      border-[#dedede]
      bg-white
      text-[#222]
      hover:bg-[#f7f7f7]
    `,

    ghost: `
      bg-transparent
      text-[#555]
      hover:bg-[#f5f5f5]
      hover:text-[#111]
    `,

    danger: `
      bg-[#dc2626]
      text-white
      hover:bg-[#b91c1c]
    `,
  }

  const sizes = {
    sm: `
      h-[32px]
      px-3
      text-[11px]
    `,

    md: `
      h-[38px]
      px-4
      text-[12px]
    `,

    lg: `
      h-[42px]
      px-5
      text-[12px]
    `,
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex
        items-center
        justify-center
        gap-1.5

        ${fullWidth ? "w-full" : "w-auto"}

        rounded-full

        font-medium

        transition-all
        duration-200

        active:scale-[0.99]

        disabled:pointer-events-none
        disabled:opacity-60

        ${variants[variant]}
        ${sizes[size]}

        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2
            size={14}
            className="animate-spin"
          />

          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}