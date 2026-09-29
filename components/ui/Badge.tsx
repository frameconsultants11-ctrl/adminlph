import { ReactNode } from "react"

type BadgeVariant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info"

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<
  BadgeVariant,
  string
> = {
  default:
    "bg-[#f5f5f5] text-[#555] border-[#e5e5e5]",

  success:
    "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",

  danger:
    "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",

  warning:
    "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",

  info:
    "bg-[#f5f5f5] text-[#444] border-[#e5e5e5]",
}

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-sm
        border
        px-2
        py-1
        text-[11px]
        font-medium
        leading-none
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}