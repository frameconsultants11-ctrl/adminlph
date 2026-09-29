"use client"

import {
  SearchIcon,
  X,
} from "lucide-react"

import FilterBar from "@/components/ui/FilterBar"

import AuthInput from "../auth/AuthInput"
import AuthButton from "../auth/AuthButton"

type UserFiltersProps = {
  search: string
  role: string
  status: string

  onSearchChange: (
    value: string
  ) => void

  onRoleChange: (
    value: string
  ) => void

  onStatusChange: (
    value: string
  ) => void

  onClear: () => void
}

export default function UserFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClear,
}: UserFiltersProps) {
  const hasFilters =
    Boolean(search || role || status)

  return (
    <div className="mb-4">
      <FilterBar>
        {/* SEARCH */}

        <div className="w-full max-w-[280px] shrink-0">
          <AuthInput
            value={search}
            onChange={(event) =>
              onSearchChange(
                event.target.value
              )
            }
            placeholder="Search users..."
            leftIcon={
              <SearchIcon
                size={16}
                strokeWidth={1.8}
              />
            }
          />
        </div>

        {/* ROLE */}

        <select
          value={role}
          onChange={(event) =>
            onRoleChange(
              event.target.value
            )
          }
          className="
            h-9
            w-auto
            shrink-0
            rounded-md
            border
            border-[#e5e5e5]
            bg-white
            px-3
            text-[12px]
            text-[#444]
            outline-none
            transition

            hover:border-[#d5d5d5]

            focus:border-[#111]
            focus:ring-2
            focus:ring-[#111]/5

            dark:border-[#333]
            dark:bg-[#202020]
            dark:text-[#ddd]

            dark:hover:border-[#444]

            dark:focus:border-[#666]
            dark:focus:ring-white/5
          "
        >
          <option value="">
            All roles
          </option>

          <option value="admin">
            Admin
          </option>

          <option value="manager">
            Manager
          </option>

          <option value="staff">
            Staff
          </option>
        </select>

        {/* STATUS */}

        <select
          value={status}
          onChange={(event) =>
            onStatusChange(
              event.target.value
            )
          }
          className="
            h-9
            w-auto
            shrink-0
            rounded-md
            border
            border-[#e5e5e5]
            bg-white
            px-3
            text-[12px]
            text-[#444]
            outline-none
            transition

            hover:border-[#d5d5d5]

            focus:border-[#111]
            focus:ring-2
            focus:ring-[#111]/5

            dark:border-[#333]
            dark:bg-[#202020]
            dark:text-[#ddd]

            dark:hover:border-[#444]

            dark:focus:border-[#666]
            dark:focus:ring-white/5
          "
        >
          <option value="">
            All status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>
        </select>

        {/* CLEAR */}

        {hasFilters && (
          <AuthButton
            type="button"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={onClear}
            className="
              !h-8
              !w-auto
              min-w-0
              shrink-0
              !px-2.5
              gap-1.5
              rounded-md

              text-[11px]
              text-[#777]

              hover:bg-[#f5f5f5]
              hover:text-[#222]

              dark:text-[#888]
              dark:hover:bg-[#242424]
              dark:hover:text-[#ddd]
            "
          >
            <X size={13} />
            <span>Clear</span>
          </AuthButton>
        )}
      </FilterBar>
    </div>
  )
}