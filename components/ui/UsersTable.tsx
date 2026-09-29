"use client"

import {
  MoreHorizontal,
} from "lucide-react"

import DataTable, {
  DataTableColumn,
} from "@/components/ui/DataTable"

import Badge from "@/components/ui/Badge"

export type AdminUser = {
  _id?: string
  id?: string
  name: string
  email: string
  role:
    | "admin"
    | "manager"
    | "staff"
  isActive: boolean
  createdAt: string
}

type UsersTableProps = {
  users: AdminUser[]
  onView: (user: AdminUser) => void
}

export default function UsersTable({
  users,
  onView,
}: UsersTableProps) {
  const columns: DataTableColumn<AdminUser>[] =
    [
      {
        key: "user",
        label: "User",
        render: (user) => (
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#111]
                text-[10px]
                font-semibold
                text-white
              "
            >
              {user.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate font-medium text-[#222] dark:text-gray-300">
                {user.name}
              </p>

              <p className="truncate text-[11px] text-[#999]">
                {user.email}
              </p>
            </div>
          </div>
        ),
      },

      {
        key: "role",
        label: "Role",
        render: (user) => (
          <span className="capitalize text-[#444]">
            {user.role}
          </span>
        ),
      },

      {
        key: "status",
        label: "Status",
        render: (user) => (
          <Badge
            variant={
              user.isActive
                ? "success"
                : "danger"
            }
          >
            {user.isActive
              ? "Active"
              : "Inactive"}
          </Badge>
        ),
      },

      {
        key: "createdAt",
        label: "Created",
        render: (user) =>
          new Date(
            user.createdAt
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }
          ),
      },

      {
        key: "actions",
        label: "",
        className: "w-[50px]",
        render: (user) => (
          <button
            type="button"
            onClick={() =>
              onView(user)

            }
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-md
              text-[#777]
              transition
              hover:bg-[#f3f3f3]
              hover:text-[#111]
            "
          >
            <MoreHorizontal
              size={16}
            />
          </button>
        ),
      },
    ]

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey={(user) => user._id}
    />
  )
}