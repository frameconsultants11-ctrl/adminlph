import { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#111] dark:text-gray-50">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-[12px] text-[#888]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}