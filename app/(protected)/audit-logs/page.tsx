"use client"

import {
  useCallback,
  useEffect,
  useState,
} from "react"

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  RefreshCw,
  ShieldCheck,
  User,
  Globe,
  Monitor,
  Clock,
  Filter,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import Badge from "@/components/ui/Badge"
import Modal from "@/components/ui/Modal"
import BackButton from "@/components/ui/BackButton"
import { getDeviceLabel } from "@/lib/device-info"

type AuditLog = {
  id: string
  action: string

  user: {
    id: string
    name: string
    email: string
  } | null

  ip: string | null
  userAgent: string | null
  sessionId: string | null

  metadata: Record<string, unknown> | null

  createdAt: string
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

const ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "TOKEN_REFRESH",
  "SESSION_TERMINATED",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "ACCOUNT_ENABLED",
  "ACCOUNT_DISABLED",
  "PASSWORD_RESET",
]

function getActionVariant(
  action: string
): "default" | "success" | "danger" | "warning" {
  if (
    action === "LOGIN" ||
    action === "TOKEN_REFRESH" ||
    action === "ACCOUNT_ENABLED"
  ) {
    return "success"
  }

  if (
    action === "LOGIN_FAILED" ||
    action === "PASSWORD_CHANGE_FAILED" ||
    action === "ACCOUNT_DISABLED"
  ) {
    return "danger"
  }

  if (
    action === "PASSWORD_RESET" ||
    action === "PASSWORD_CHANGED"
  ) {
    return "warning"
  }

  return "default"
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

function formatRelativeDate(date: string) {
  const value = new Date(date)
  const now = new Date()

  const diff =
    now.getTime() - value.getTime()

  const minutes = Math.floor(
    diff / 60000
  )

  const hours = Math.floor(
    diff / 3600000
  )

  const days = Math.floor(
    diff / 86400000
  )

  if (minutes < 1) {
    return "Just now"
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  if (hours < 24) {
    return `${hours}h ago`
  }

  if (days < 7) {
    return `${days}d ago`
  }

  return formatDate(date)
}

function shorten(
  value: string | null,
  length = 24
) {
  if (!value) {
    return "—"
  }

  if (value.length <= length) {
    return value
  }

  return `${value.slice(0, length)}...`
}

function getActionLabel(action: string) {
  return action.replaceAll("_", " ")
}

export default function AuditLogsPage() {
  const [logs, setLogs] =
    useState<AuditLog[]>([])

  const [pagination, setPagination] =
    useState<Pagination | null>(null)

  const [page, setPage] =
    useState(1)

  /*
   * ------------------------------------------------
   * DRAFT FILTERS
   *
   * These values change while the user types.
   * They DO NOT trigger the API.
   * ------------------------------------------------
   */

  const [searchInput, setSearchInput] =
    useState("")

  const [actionInput, setActionInput] =
    useState("")

  const [ipInput, setIpInput] =
    useState("")

  const [sessionIdInput, setSessionIdInput] =
    useState("")

  const [fromInput, setFromInput] =
    useState("")

  const [toInput, setToInput] =
    useState("")

  /*
   * ------------------------------------------------
   * APPLIED FILTERS
   *
   * API requests use these values only.
   * ------------------------------------------------
   */

  const [search, setSearch] =
    useState("")

  const [action, setAction] =
    useState("")

  const [ip, setIp] =
    useState("")

  const [sessionId, setSessionId] =
    useState("")

  const [from, setFrom] =
    useState("")

  const [to, setTo] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null)

  /*
   * ------------------------------------------------
   * FETCH LOGS
   * ------------------------------------------------
   */

  const fetchLogs = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError("")

        const params =
          new URLSearchParams()

        params.set(
          "page",
          String(page)
        )

        params.set(
          "limit",
          "20"
        )

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          )
        }

        if (action) {
          params.set(
            "action",
            action
          )
        }

        if (ip.trim()) {
          params.set(
            "ip",
            ip.trim()
          )
        }

        if (sessionId.trim()) {
          params.set(
            "sessionId",
            sessionId.trim()
          )
        }

        if (from) {
          params.set(
            "from",
            from
          )
        }

        if (to) {
          params.set(
            "to",
            to
          )
        }

        const response =
          await apiFetch(
            `/api/admin/audit-logs?${params.toString()}`
          )

        const data =
          await response
            .json()
            .catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to fetch audit logs."
          )
        }

        setLogs(
          data?.logs || []
        )

        setPagination(
          data?.pagination || null
        )
      } catch (error) {
        console.error(
          "FETCH AUDIT LOGS ERROR:",
          error
        )

        setError(
          error instanceof Error
            ? error.message
            : "Unable to fetch audit logs."
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      page,
      search,
      action,
      ip,
      sessionId,
      from,
      to,
    ]
  )

  /*
   * ------------------------------------------------
   * FETCH WHEN PAGE OR APPLIED FILTERS CHANGE
   * ------------------------------------------------
   */

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  /*
   * ------------------------------------------------
   * APPLY FILTERS
   * ------------------------------------------------
   */

  function applyFilters() {
    if (
      fromInput &&
      toInput &&
      fromInput > toInput
    ) {
      setError(
        "From date cannot be after To date."
      )

      return
    }

    setError("")

    setSearch(
      searchInput.trim()
    )

    setAction(
      actionInput
    )

    setIp(
      ipInput.trim()
    )

    setSessionId(
      sessionIdInput.trim()
    )

    setFrom(
      fromInput
    )

    setTo(
      toInput
    )

    setPage(1)
  }

  /*
   * ------------------------------------------------
   * RESET FILTERS
   * ------------------------------------------------
   */

  function resetFilters() {
    setSearchInput("")
    setActionInput("")
    setIpInput("")
    setSessionIdInput("")
    setFromInput("")
    setToInput("")

    setSearch("")
    setAction("")
    setIp("")
    setSessionId("")
    setFrom("")
    setTo("")

    setPage(1)
    setError("")
  }

  /*
   * ------------------------------------------------
   * ACTIVE FILTER COUNT
   * ------------------------------------------------
   */

  const activeFilterCount = [
    search,
    action,
    ip,
    sessionId,
    from,
    to,
  ].filter(Boolean).length

  const hasFilters =
    activeFilterCount > 0

  return (
    <div
      className="
        min-h-full
        bg-white

        dark:bg-[#111]
      "
    >
      <div
        className="
          mx-auto
          w-full
          px-4
          py-8

          sm:px-8
          sm:py-10

          lg:px-16
          lg:py-8
        "
      >
        {/* BACK */}

        <BackButton />

        {/* HEADER */}

        <div
          className="
            mb-6
            flex
            flex-col
            gap-4

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck
                size={17}
                strokeWidth={1.8}
                className="
                  text-[#555]

                  dark:text-[#aaa]
                "
              />

              <h1
                className="
                  text-[18px]
                  font-semibold
                  text-[#111]

                  dark:text-white
                "
              >
                Audit Logs
              </h1>
            </div>

            <p
              className="
                mt-1
                text-[11px]
                text-[#888]

                dark:text-[#777]
              "
            >
              Monitor authentication and
              administrative activity.
            </p>
          </div>

          {/* REFRESH */}

          <button
            type="button"
            onClick={() =>
              fetchLogs(true)
            }
            disabled={refreshing}
            className="
              inline-flex
              h-[34px]
              items-center
              justify-center
              gap-2
              rounded-lg
              border
              border-[#e5e5e5]
              bg-white
              px-3
              text-[11px]
              font-medium
              text-[#444]
              transition

              hover:bg-[#f8f8f8]

              disabled:pointer-events-none
              disabled:opacity-50

              dark:border-[#333]
              dark:bg-[#202020]
              dark:text-[#ddd]

              dark:hover:bg-[#272727]
            "
          >
            <RefreshCw
              size={13}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>

        {/* FILTER PANEL */}

        <div
          className="
            mb-5
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white
            p-4

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          {/* FILTER HEADER */}

          <div
            className="
              mb-4
              flex
              items-center
              justify-between
            "
          >
            <div className="flex items-center gap-2">
              <Filter
                size={14}
                className="
                  text-[#777]

                  dark:text-[#999]
                "
              />

              <p
                className="
                  text-[11px]
                  font-medium
                  text-[#444]

                  dark:text-[#ddd]
                "
              >
                Filters
              </p>

              {activeFilterCount > 0 && (
                <span
                  className="
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-[#111]
                    px-1.5
                    text-[9px]
                    font-medium
                    text-white

                    dark:bg-white
                    dark:text-[#111]
                  "
                >
                  {activeFilterCount}
                </span>
              )}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="
                  text-[10px]
                  text-[#888]
                  transition

                  hover:text-[#111]

                  dark:hover:text-white
                "
              >
                Reset filters
              </button>
            )}
          </div>

          {/* SEARCH + ACTION */}

          <div
            className="
              grid
              grid-cols-1
              gap-3

              lg:grid-cols-[1fr_220px]
            "
          >
            {/* SEARCH */}

            <div className="relative">
              <Search
                size={14}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-[#999]

                  dark:text-[#777]
                "
              />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value
                  )
                }
                placeholder="Search IP or user agent..."
                className="
                  h-[38px]
                  w-full
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  pl-9
                  pr-3
                  text-[11px]
                  text-[#222]
                  outline-none
                  transition
                  placeholder:text-[#aaa]

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#eee]
                  dark:placeholder:text-[#666]

                  dark:focus:border-[#666]
                "
              />
            </div>

            {/* ACTION */}

            <div
              className="
                relative
                w-full
              "
            >
              <select
                value={actionInput}
                onChange={(event) =>
                  setActionInput(
                    event.target.value
                  )
                }
                className="
                  h-[38px]
                  w-full
                  appearance-none
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-3
                  pr-8
                  text-[11px]
                  text-[#333]
                  outline-none

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#ddd]

                  dark:focus:border-[#666]
                "
              >
                <option value="">
                  All actions
                </option>

                {ACTIONS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {getActionLabel(
                        item
                      )}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={14}
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-[#999]

                  dark:text-[#777]
                "
              />
            </div>
          </div>

          {/* ADVANCED FILTERS */}

          <div
            className="
              mt-3
              grid
              grid-cols-1
              gap-3

              sm:grid-cols-2

              xl:grid-cols-4
            "
          >
            {/* IP */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-[#999]

                  dark:text-[#777]
                "
              >
                IP Address
              </label>

              <input
                value={ipInput}
                onChange={(event) =>
                  setIpInput(
                    event.target.value
                  )
                }
                placeholder="e.g. 192.168.1.1"
                className="
                  h-[38px]
                  w-full
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-3
                  text-[11px]
                  text-[#222]
                  outline-none

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#eee]

                  dark:focus:border-[#666]
                "
              />
            </div>

            {/* SESSION ID */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-[#999]

                  dark:text-[#777]
                "
              >
                Session ID
              </label>

              <input
                value={sessionIdInput}
                onChange={(event) =>
                  setSessionIdInput(
                    event.target.value
                  )
                }
                placeholder="Session ID"
                className="
                  h-[38px]
                  w-full
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-3
                  font-mono
                  text-[10px]
                  text-[#222]
                  outline-none

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#eee]

                  dark:focus:border-[#666]
                "
              />
            </div>

            {/* FROM */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-[#999]

                  dark:text-[#777]
                "
              >
                From
              </label>

              <input
                type="date"
                value={fromInput}
                onChange={(event) =>
                  setFromInput(
                    event.target.value
                  )
                }
                className="
                  h-[38px]
                  w-full
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-3
                  text-[11px]
                  text-[#333]
                  outline-none

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#ddd]

                  dark:focus:border-[#666]
                "
              />
            </div>

            {/* TO */}

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-[#999]

                  dark:text-[#777]
                "
              >
                To
              </label>

              <input
                type="date"
                value={toInput}
                onChange={(event) =>
                  setToInput(
                    event.target.value
                  )
                }
                className="
                  h-[38px]
                  w-full
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-3
                  text-[11px]
                  text-[#333]
                  outline-none

                  focus:border-[#bbb]

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#ddd]

                  dark:focus:border-[#666]
                "
              />
            </div>
          </div>

          {/* ACTIONS */}

          <div
            className="
              mt-4
              flex
              flex-col
              gap-2

              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <p
              className="
                text-[10px]
                text-[#999]

                dark:text-[#666]
              "
            >
              {pagination
                ? `${pagination.total} ${
                    pagination.total === 1
                      ? "log"
                      : "logs"
                  } found`
                : " "}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="
                  inline-flex
                  h-[36px]
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border
                  border-[#e5e5e5]
                  px-4
                  text-[11px]
                  text-[#666]
                  transition

                  hover:bg-[#f7f7f7]

                  dark:border-[#333]
                  dark:text-[#888]

                  dark:hover:bg-[#242424]
                  dark:hover:text-[#ddd]
                "
              >
                <X size={13} />
                Reset
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="
                  inline-flex
                  h-[36px]
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  bg-[#111]
                  px-4
                  text-[11px]
                  font-medium
                  text-white
                  transition

                  hover:bg-[#222]

                  dark:bg-white
                  dark:text-[#111]

                  dark:hover:bg-[#eee]
                "
              >
                <Search size={13} />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="
              mb-5
              flex
              items-center
              justify-between
              gap-3
              rounded-lg
              border
              border-red-100
              bg-red-50
              px-4
              py-3
              text-[11px]
              text-red-600

              dark:border-red-900/50
              dark:bg-red-950/20
              dark:text-red-400
            "
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="
                shrink-0
                text-red-400
                hover:text-red-600
              "
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* TABLE */}

        <div
          className="
            overflow-hidden
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          {/* DESKTOP */}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr
                  className="
                    border-b
                    border-[#eeeeee]
                    bg-[#fafafa]

                    dark:border-[#2a2a2a]
                    dark:bg-[#1c1c1c]
                  "
                >
                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#999]">
                    Action
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#999]">
                    User
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#999]">
                    IP Address
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#999]">
                    Session
                  </th>

                  <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wide text-[#999]">
                    Date
                  </th>

                  <th className="w-[50px]" />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({
                    length: 8,
                  }).map((_, index) => (
                    <tr
                      key={index}
                      className="
                        border-b
                        border-[#f0f0f0]

                        dark:border-[#242424]
                      "
                    >
                      <td
                        colSpan={6}
                        className="px-4 py-4"
                      >
                        <div
                          className="
                            h-4
                            w-full
                            animate-pulse
                            rounded
                            bg-[#f5f5f5]

                            dark:bg-[#242424]
                          "
                        />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center"
                    >
                      <div
                        className="
                          mx-auto
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-full
                          bg-[#f7f7f7]

                          dark:bg-[#242424]
                        "
                      >
                        <ShieldCheck
                          size={17}
                          className="
                            text-[#999]

                            dark:text-[#777]
                          "
                        />
                      </div>

                      <p
                        className="
                          mt-3
                          text-[12px]
                          font-medium
                          text-[#444]

                          dark:text-[#ddd]
                        "
                      >
                        No audit logs found
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-[#999]

                          dark:text-[#777]
                        "
                      >
                        Try changing your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() =>
                        setSelectedLog(log)
                      }
                      className="
                        cursor-pointer
                        border-b
                        border-[#f0f0f0]
                        transition
                        last:border-0
                        hover:bg-[#fafafa]

                        dark:border-[#242424]
                        dark:hover:bg-[#1d1d1d]
                      "
                    >
                      {/* ACTION */}

                      <td className="px-4 py-3.5">
                        <Badge
                          variant={getActionVariant(
                            log.action
                          )}
                        >
                          {getActionLabel(
                            log.action
                          )}
                        </Badge>
                      </td>

                      {/* USER */}

                      <td className="px-4 py-3.5">
                        {log.user ? (
                          <div>
                            <p
                              className="
                                text-[11px]
                                font-medium
                                text-[#222]

                                dark:text-[#eee]
                              "
                            >
                              {log.user.name}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[10px]
                                text-[#999]

                                dark:text-[#777]
                              "
                            >
                              {log.user.email}
                            </p>
                          </div>
                        ) : (
                          <span
                            className="
                              text-[11px]
                              text-[#999]

                              dark:text-[#777]
                            "
                          >
                            System
                          </span>
                        )}
                      </td>

                      {/* IP */}

                      <td className="px-4 py-3.5">
                        <span
                          className="
                            font-mono
                            text-[10px]
                            text-[#555]

                            dark:text-[#aaa]
                          "
                        >
                          {log.ip || "—"}
                        </span>
                      </td>

                      {/* SESSION */}

                      <td className="px-4 py-3.5">
                        <span
                          className="
                            font-mono
                            text-[10px]
                            text-[#777]

                            dark:text-[#888]
                          "
                          title={
                            log.sessionId ||
                            ""
                          }
                        >
                          {shorten(
                            log.sessionId,
                            18
                          )}
                        </span>
                      </td>

                      {/* DATE */}

                      <td className="px-4 py-3.5">
                        <div>
                          <p
                            className="
                              text-[10px]
                              text-[#555]

                              dark:text-[#aaa]
                            "
                          >
                            {formatRelativeDate(
                              log.createdAt
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[9px]
                              text-[#aaa]

                              dark:text-[#666]
                            "
                          >
                            {formatDate(
                              log.createdAt
                            )}
                          </p>
                        </div>
                      </td>

                      {/* ARROW */}

                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight
                          size={14}
                          className="
                            text-[#bbb]

                            dark:text-[#666]
                          "
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}

          <div className="md:hidden">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="
                      h-[80px]
                      animate-pulse
                      rounded-lg
                      bg-[#f7f7f7]

                      dark:bg-[#242424]
                    "
                  />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <ShieldCheck
                  size={20}
                  className="
                    mx-auto
                    text-[#aaa]

                    dark:text-[#777]
                  "
                />

                <p
                  className="
                    mt-3
                    text-[12px]
                    font-medium
                    text-[#444]

                    dark:text-[#ddd]
                  "
                >
                  No audit logs found
                </p>
              </div>
            ) : (
              <div>
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() =>
                      setSelectedLog(log)
                    }
                    className="
                      flex
                      w-full
                      items-start
                      justify-between
                      border-b
                      border-[#f0f0f0]
                      px-4
                      py-4
                      text-left
                      last:border-0
                      hover:bg-[#fafafa]

                      dark:border-[#242424]
                      dark:hover:bg-[#1d1d1d]
                    "
                  >
                    <div className="min-w-0">
                      <Badge
                        variant={getActionVariant(
                          log.action
                        )}
                      >
                        {getActionLabel(
                          log.action
                        )}
                      </Badge>

                      <p
                        className="
                          mt-2
                          truncate
                          text-[11px]
                          font-medium
                          text-[#222]

                          dark:text-[#eee]
                        "
                      >
                        {log.user?.name ||
                          "System"}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          text-[#999]

                          dark:text-[#777]
                        "
                      >
                        {log.ip ||
                          "Unknown IP"}
                      </p>
                    </div>

                    <div
                      className="
                        ml-4
                        shrink-0
                        text-right
                      "
                    >
                      <p
                        className="
                          text-[10px]
                          text-[#777]

                          dark:text-[#888]
                        "
                      >
                        {formatRelativeDate(
                          log.createdAt
                        )}
                      </p>

                      <ChevronRight
                        size={14}
                        className="
                          ml-auto
                          mt-2
                          text-[#bbb]

                          dark:text-[#666]
                        "
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PAGINATION */}

        {!loading &&
          pagination &&
          pagination.totalPages > 0 && (
            <div
              className="
                mt-4
                flex
                items-center
                justify-between
              "
            >
              <p
                className="
                  text-[10px]
                  text-[#999]

                  dark:text-[#666]
                "
              >
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </p>

              <div className="flex items-center gap-1.5">
                {/* PREVIOUS */}

                <button
                  type="button"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          current - 1,
                          1
                        )
                    )
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-[#e5e5e5]
                    text-[#555]
                    transition

                    hover:bg-[#f7f7f7]

                    disabled:pointer-events-none
                    disabled:opacity-40

                    dark:border-[#333]
                    dark:text-[#aaa]

                    dark:hover:bg-[#242424]
                  "
                >
                  <ChevronLeft size={14} />
                </button>

                {/* PAGE NUMBERS */}

                <div className="flex items-center gap-1">
                  {Array.from(
                    {
                      length: Math.min(
                        pagination.totalPages,
                        5
                      ),
                    },
                    (_, index) => {
                      const pageNumber =
                        index + 1

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() =>
                            setPage(
                              pageNumber
                            )
                          }
                          className={`
                            h-8
                            min-w-8
                            rounded-lg
                            px-2
                            text-[10px]
                            transition

                            ${
                              pageNumber ===
                              pagination.page
                                ? `
                                  bg-[#111]
                                  text-white

                                  dark:bg-white
                                  dark:text-[#111]
                                `
                                : `
                                  text-[#666]
                                  hover:bg-[#f5f5f5]

                                  dark:text-[#888]
                                  dark:hover:bg-[#242424]
                                  dark:hover:text-[#ddd]
                                `
                            }
                          `}
                        >
                          {pageNumber}
                        </button>
                      )
                    }
                  )}
                </div>

                {/* NEXT */}

                <button
                  type="button"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-[#e5e5e5]
                    text-[#555]
                    transition

                    hover:bg-[#f7f7f7]

                    disabled:pointer-events-none
                    disabled:opacity-40

                    dark:border-[#333]
                    dark:text-[#aaa]

                    dark:hover:bg-[#242424]
                  "
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* DETAILS MODAL */}

      <Modal
        open={!!selectedLog}
        onClose={() =>
          setSelectedLog(null)
        }
        title="Audit Log"
        description="Detailed information about this activity."
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* ACTION */}

            <div>
              <p
                className="
                  mb-1.5
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-wide
                  text-[#999]

                  dark:text-[#777]
                "
              >
                Action
              </p>

              <Badge
                variant={getActionVariant(
                  selectedLog.action
                )}
              >
                {getActionLabel(
                  selectedLog.action
                )}
              </Badge>
            </div>

            {/* USER */}

            <div
              className="
                rounded-lg
                border
                border-[#eeeeee]
                bg-[#fafafa]
                p-3

                dark:border-[#2a2a2a]
                dark:bg-[#1c1c1c]
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-white

                    dark:bg-[#242424]
                  "
                >
                  <User
                    size={14}
                    className="
                      text-[#777]

                      dark:text-[#aaa]
                    "
                  />
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-medium
                      text-[#222]

                      dark:text-[#eee]
                    "
                  >
                    {selectedLog.user?.name ||
                      "System"}
                  </p>

                  {selectedLog.user?.email && (
                    <p
                      className="
                        mt-0.5
                        text-[10px]
                        text-[#999]

                        dark:text-[#777]
                      "
                    >
                      {
                        selectedLog.user
                          .email
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* INFO */}

            <div
              className="
                grid
                grid-cols-1
                gap-3

                sm:grid-cols-2
              "
            >
              <InfoItem
                icon={<Globe size={13} />}
                label="IP Address"
                value={
                  selectedLog.ip ||
                  "—"
                }
              />

              <InfoItem
                icon={<Clock size={13} />}
                label="Created"
                value={formatDate(
                  selectedLog.createdAt
                )}
              />

              <InfoItem
                icon={<Monitor size={13} />}
                label="Session ID"
                value={
                  selectedLog.sessionId ||
                  "—"
                }
                mono
              />

              <InfoItem
                icon={<Monitor size={13} />}
                label="Device"
                value={
                  selectedLog.userAgent
                    ? getDeviceLabel(
                        selectedLog.userAgent
                      )
                    : "—"
                }
              />

              <InfoItem
                icon={<Monitor size={13} />}
                label="User Agent"
                value={
                  selectedLog.userAgent ||
                  "—"
                }
              />
            </div>

            {/* METADATA */}

            {selectedLog.metadata &&
              Object.keys(
                selectedLog.metadata
              ).length > 0 && (
                <div>
                  <p
                    className="
                      mb-2
                      text-[9px]
                      font-medium
                      uppercase
                      tracking-wide
                      text-[#999]

                      dark:text-[#777]
                    "
                  >
                    Metadata
                  </p>

                  <pre
                    className="
                      max-h-[240px]
                      overflow-auto
                      rounded-lg
                      bg-[#111]
                      p-3
                      text-[10px]
                      leading-5
                      text-[#ddd]

                      dark:bg-[#0d0d0d]
                      dark:text-[#ccc]
                    "
                  >
                    {JSON.stringify(
                      selectedLog.metadata,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="
        rounded-lg
        border
        border-[#eeeeee]
        p-3

        dark:border-[#2a2a2a]
        dark:bg-[#171717]
      "
    >
      <div
        className="
          flex
          items-center
          gap-1.5
          text-[#999]

          dark:text-[#777]
        "
      >
        {icon}

        <span
          className="
            text-[9px]
            font-medium
            uppercase
            tracking-wide
          "
        >
          {label}
        </span>
      </div>

      <p
        className={`
          mt-2
          break-all
          text-[10px]
          text-[#444]

          dark:text-[#ccc]

          ${mono ? "font-mono" : ""}
        `}
      >
        {value}
      </p>
    </div>
  )
}