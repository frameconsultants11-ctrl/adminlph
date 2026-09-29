import { ReactNode } from "react"

type FilterBarProps = {
  children: ReactNode
  className?: string
}

export default function FilterBar({
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={`
        flex
        flex-wrap
        items-center
        gap-2
        ${className}
      `}
    >
      {children}
    </div>
  )
}