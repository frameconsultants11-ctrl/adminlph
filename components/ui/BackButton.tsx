"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

export default function BackButton({
  href,
  label = "Back",
  className = "",
}: BackButtonProps) {
  const router = useRouter()

  function handleClick() {
    if (href) {
      router.push(href)
      return
    }

    router.back()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        mb-6
        flex
        items-center
        gap-2
        cursor-pointer
        text-[11px]
        text-[#888]
        transition 
        dark:text-gray-300
        dark:hover:text-gray-200
        hover:text-[#111]
        ${className}
      `}
    >
      <ArrowLeft
        size={14}
        strokeWidth={1.8}
      />

      {label}
    </button>
  )
}