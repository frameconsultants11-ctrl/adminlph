"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserX,
} from "lucide-react"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"

type SecurityStats = {
  loginSuccess: number
  loginFailures: number
  activeSessions: number
  lockedAccounts: number
  passwordChanges: number
  tokenRefreshes: number
}

type ActivityItem = {
  date: string
  login: number
  loginFailed: number
  logout: number
}

type RecentEvent = {
  id: string
  action: string

  user: {
    id: string
    name: string
    email: string
  } | null

  ip: string | null
  sessionId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

type DashboardResponse = {
  success: boolean

  stats: SecurityStats

  activity: ActivityItem[]

  recentEvents: RecentEvent[]
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN"
  ).format(value)
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value))
}

function formatRelativeDate(
  value: string
) {
  const date =
    new Date(value)

  const now =
    new Date()

  const diff =
    now.getTime() -
    date.getTime()

  const minutes =
    Math.floor(
      diff / 60000
    )

  const hours =
    Math.floor(
      diff / 3600000
    )

  const days =
    Math.floor(
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

  return formatDate(value)
}

function getEventStyle(
  action: string
) {
  if (
    action ===
      "LOGIN_FAILED" ||
    action ===
      "ACCOUNT_DISABLED"
  ) {
    return {
      icon: AlertTriangle,
      className:
        "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    }
  }

  if (
    action ===
      "PASSWORD_CHANGED" ||
    action ===
      "PASSWORD_RESET"
  ) {
    return {
      icon: KeyRound,
      className:
        "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    }
  }

  if (
    action ===
      "SESSION_TERMINATED" ||
    action ===
      "USER_DELETED"
  ) {
    return {
      icon: UserX,
      className:
        "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
    }
  }

  return {
    icon: ShieldCheck,
    className:
      "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
  }
}

function getEventLabel(
  action: string
) {
  return action.replaceAll(
    "_",
    " "
  )
}

export default function SecurityDashboardPage() {
  const [
    data,
    setData,
  ] =
    useState<DashboardResponse | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState("")

  const [
    days,
    setDays,
  ] = useState(7)

  const fetchDashboard =
    useCallback(
      async (
        showRefresh = false
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true)
          } else {
            setLoading(true)
          }

          setError("")

          const response =
            await apiFetch(
              `/api/admin/security-stats?days=${days}`
            )

          const result =
            await response
              .json()
              .catch(
                () => null
              )

          if (!response.ok) {
            throw new Error(
              result?.message ||
                "Failed to load security dashboard."
            )
          }

          setData(result)
        } catch (error) {
          console.error(
            "SECURITY DASHBOARD ERROR:",
            error
          )

          setError(
            error instanceof Error
              ? error.message
              : "Failed to load security dashboard."
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      [days]
    )

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const maxActivity =
    useMemo(() => {
      if (
        !data?.activity?.length
      ) {
        return 1
      }

      return Math.max(
        ...data.activity.map(
          (item) =>
            item.login +
            item.loginFailed
        ),
        1
      )
    }, [data])

  const stats =
    data?.stats

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
        <BackButton/>
        {/* HEADER */}

        <div
          className="
            mb-7
            flex
            flex-col
            gap-4

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <ShieldCheck
                size={18}
                className="
                  text-[#555]

                  dark:text-[#aaa]
                "
              />

              <h1
                className="
                  text-[19px]
                  font-semibold
                  text-[#111]

                  dark:text-white
                "
              >
                Security Dashboard
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
              Monitor authentication,
              sessions and security
              activity.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            {/* PERIOD */}

            <select
              value={days}
              onChange={(event) =>
                setDays(
                  Number(
                    event.target.value
                  )
                )
              }
              className="
                h-[34px]
                rounded-lg
                border
                border-[#e5e5e5]
                bg-white
                px-3
                text-[11px]
                text-[#444]
                outline-none

                dark:border-[#333]
                dark:bg-[#202020]
                dark:text-[#ddd]
              "
            >
              <option value={7}>
                Last 7 days
              </option>

              <option value={14}>
                Last 14 days
              </option>

              <option value={30}>
                Last 30 days
              </option>
            </select>

            {/* REFRESH */}

            <button
              type="button"
              onClick={() =>
                fetchDashboard(
                  true
                )
              }
              disabled={refreshing}
              className="
                flex
                h-[34px]
                items-center
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

                hover:bg-[#f7f7f7]

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
        </div>

        {/* ERROR */}

        {error && (
          <div
            className="
              mb-5
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
            {error}
          </div>
        )}

        {/* STATS */}

        <div
          className="
            grid
            grid-cols-1
            gap-3

            sm:grid-cols-2

            xl:grid-cols-3
          "
        >
          <StatCard
            title="Login Success"
            value={
              stats?.loginSuccess
            }
            icon={
              <CheckCircle2
                size={16}
              />
            }
            description={`Last ${days} days`}
            variant="success"
            loading={loading}
          />

          <StatCard
            title="Login Failures"
            value={
              stats?.loginFailures
            }
            icon={
              <ShieldAlert
                size={16}
              />
            }
            description={`Last ${days} days`}
            variant="danger"
            loading={loading}
          />

          <StatCard
            title="Active Sessions"
            value={
              stats?.activeSessions
            }
            icon={
              <Users size={16} />
            }
            description="Currently active"
            variant="default"
            loading={loading}
          />

          <StatCard
            title="Locked Accounts"
            value={
              stats?.lockedAccounts
            }
            icon={
              <UserX size={16} />
            }
            description="Currently locked"
            variant="warning"
            loading={loading}
          />

          <StatCard
            title="Password Changes"
            value={
              stats?.passwordChanges
            }
            icon={
              <KeyRound size={16} />
            }
            description={`Last ${days} days`}
            variant="warning"
            loading={loading}
          />

          <StatCard
            title="Token Refreshes"
            value={
              stats?.tokenRefreshes
            }
            icon={
              <RefreshCw size={16} />
            }
            description={`Last ${days} days`}
            variant="default"
            loading={loading}
          />
        </div>

        {/* ACTIVITY */}

        <div
          className="
            mt-5
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white
            p-5

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          <div
            className="
              mb-5
              flex
              items-center
              justify-between
            "
          >
            <div>
              <p
                className="
                  text-[12px]
                  font-semibold
                  text-[#333]

                  dark:text-[#eee]
                "
              >
                Login Activity
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-[#999]

                  dark:text-[#666]
                "
              >
                Successful and failed
                login attempts.
              </p>
            </div>

            <Activity
              size={16}
              className="
                text-[#999]

                dark:text-[#777]
              "
            />
          </div>

          {loading ? (
            <div
              className="
                h-[180px]
                animate-pulse
                rounded-lg
                bg-[#f7f7f7]

                dark:bg-[#222]
              "
            />
          ) : (
            <div
              className="
                overflow-x-auto
              "
            >
              <div
                className="
                  flex
                  min-w-[600px]
                  items-end
                  gap-2
                "
                style={{
                  height: 190,
                }}
              >
                {data?.activity.map(
                  (item) => {
                    const total =
                      item.login +
                      item.loginFailed

                    const totalHeight =
                      Math.max(
                        (total /
                          maxActivity) *
                          140,
                        total > 0
                          ? 6
                          : 2
                      )

                    const failedHeight =
                      total > 0
                        ? (item.loginFailed /
                            total) *
                          totalHeight
                        : 0

                    const successHeight =
                      totalHeight -
                      failedHeight

                    return (
                      <div
                        key={
                          item.date
                        }
                        className="
                          flex
                          h-full
                          min-w-[28px]
                          flex-1
                          flex-col
                          items-center
                          justify-end
                        "
                      >
                        <div
                          className="
                            flex
                            w-full
                            max-w-[28px]
                            flex-col
                            justify-end
                            overflow-hidden
                            rounded-t-md
                          "
                          style={{
                            height:
                              totalHeight,
                          }}
                        >
                          {failedHeight >
                            0 && (
                            <div
                              className="
                                w-full
                                bg-red-400
                              "
                              style={{
                                height:
                                  failedHeight,
                              }}
                            />
                          )}

                          {successHeight >
                            0 && (
                            <div
                              className="
                                w-full
                                bg-green-500
                              "
                              style={{
                                height:
                                  successHeight,
                              }}
                            />
                          )}
                        </div>

                        <span
                          className="
                            mt-2
                            text-[8px]
                            text-[#999]

                            dark:text-[#666]
                          "
                        >
                          {item.date.slice(
                            5
                          )}
                        </span>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          )}

          <div
            className="
              mt-4
              flex
              items-center
              gap-5
              border-t
              border-[#eeeeee]
              pt-3

              dark:border-[#2a2a2a]
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-green-500
                "
              />

              <span
                className="
                  text-[9px]
                  text-[#888]
                "
              >
                Successful
              </span>
            </div>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-red-400
                "
              />

              <span
                className="
                  text-[9px]
                  text-[#888]
                "
              >
                Failed
              </span>
            </div>
          </div>
        </div>

        {/* RECENT EVENTS */}

        <div
          className="
            mt-5
            rounded-xl
            border
            border-[#e8e8e8]
            bg-white

            dark:border-[#2a2a2a]
            dark:bg-[#171717]
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-[#eeeeee]
              px-5
              py-4

              dark:border-[#2a2a2a]
            "
          >
            <div>
              <p
                className="
                  text-[12px]
                  font-semibold
                  text-[#333]

                  dark:text-[#eee]
                "
              >
                Recent Security Events
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-[#999]

                  dark:text-[#666]
                "
              >
                Latest important security
                activity.
              </p>
            </div>

            <ShieldAlert
              size={16}
              className="
                text-[#999]

                dark:text-[#777]
              "
            />
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  key={index}
                  className="
                    h-[58px]
                    animate-pulse
                    rounded-lg
                    bg-[#f7f7f7]

                    dark:bg-[#222]
                  "
                />
              ))}
            </div>
          ) : !data?.recentEvents
              ?.length ? (
            <div
              className="
                px-5
                py-14
                text-center
              "
            >
              <ShieldCheck
                size={20}
                className="
                  mx-auto
                  text-[#aaa]

                  dark:text-[#666]
                "
              />

              <p
                className="
                  mt-3
                  text-[11px]
                  text-[#888]
                "
              >
                No recent security
                events.
              </p>
            </div>
          ) : (
            <div>
              {data.recentEvents.map(
                (event) => {
                  const style =
                    getEventStyle(
                      event.action
                    )

                  const Icon =
                    style.icon

                  return (
                    <div
                      key={event.id}
                      className="
                        flex
                        items-center
                        gap-3
                        border-b
                        border-[#f0f0f0]
                        px-5
                        py-3.5
                        last:border-0

                        dark:border-[#242424]
                      "
                    >
                      <div
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          ${style.className}
                        `}
                      >
                        <Icon
                          size={14}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >
                          <p
                            className="
                              text-[11px]
                              font-medium
                              text-[#333]

                              dark:text-[#eee]
                            "
                          >
                            {getEventLabel(
                              event.action
                            )}
                          </p>

                          {event.user && (
                            <span
                              className="
                                text-[10px]
                                text-[#999]

                                dark:text-[#777]
                              "
                            >
                              ·{" "}
                              {
                                event
                                  .user
                                  .name
                              }
                            </span>
                          )}
                        </div>

                        <div
                          className="
                            mt-1
                            flex
                            flex-wrap
                            gap-x-3
                            gap-y-1
                            text-[9px]
                            text-[#aaa]

                            dark:text-[#666]
                          "
                        >
                          {event.ip && (
                            <span>
                              IP:{" "}
                              {
                                event.ip
                              }
                            </span>
                          )}

                          {event.sessionId && (
                            <span>
                              Session:{" "}
                              {event.sessionId.slice(
                                0,
                                12
                              )}
                              ...
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="
                          shrink-0
                          text-right
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            text-[#888]

                            dark:text-[#777]
                          "
                        >
                          {formatRelativeDate(
                            event.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
  variant,
  loading,
}: {
  title: string
  value?: number
  icon: React.ReactNode
  description: string
  variant:
    | "default"
    | "success"
    | "danger"
    | "warning"
  loading: boolean
}) {
  const iconClass = {
    default:
      "bg-[#f5f5f5] text-[#666] dark:bg-[#242424] dark:text-[#aaa]",

    success:
      "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",

    danger:
      "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",

    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  }[variant]

  return (
    <div
      className="
        rounded-xl
        border
        border-[#e8e8e8]
        bg-white
        p-4

        dark:border-[#2a2a2a]
        dark:bg-[#171717]
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
        "
      >
        <div>
          <p
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-wide
              text-[#999]

              dark:text-[#777]
            "
          >
            {title}
          </p>

          {loading ? (
            <div
              className="
                mt-3
                h-7
                w-20
                animate-pulse
                rounded
                bg-[#f2f2f2]

                dark:bg-[#242424]
              "
            />
          ) : (
            <p
              className="
                mt-2
                text-[24px]
                font-semibold
                tracking-tight
                text-[#111]

                dark:text-white
              "
            >
              {formatNumber(
                value || 0
              )}
            </p>
          )}
        </div>

        <div
          className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            ${iconClass}
          `}
        >
          {icon}
        </div>
      </div>

      <p
        className="
          mt-3
          text-[9px]
          text-[#aaa]

          dark:text-[#666]
        "
      >
        {description}
      </p>
    </div>
  )
}