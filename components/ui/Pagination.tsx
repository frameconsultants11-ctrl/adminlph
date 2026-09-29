import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-[11px] text-[#888]">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            onPageChange(page - 1)
          }
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-md
            border
            border-[#e5e5e5]
            text-[#555]
            transition
            hover:bg-[#f7f7f7]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <ChevronLeft size={14} />
        </button>

        <button
          type="button"
          disabled={
            page >= totalPages
          }
          onClick={() =>
            onPageChange(page + 1)
          }
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-md
            border
            border-[#e5e5e5]
            text-[#555]
            transition
            hover:bg-[#f7f7f7]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}