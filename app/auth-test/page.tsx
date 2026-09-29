"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-fetch"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive?: boolean
  createdAt?: string
}

type Session = {
  sessionId: string
  deviceId: string
  deviceName: string | null
  createdAt: string
  lastUsedAt?: string | null
  expiresAt: string
}

type TestResult = {
  success?: boolean
  message?: string
  [key: string]: unknown
}

export default function AuthTestPage() {
  // =========================================================
  // AUTH
  // =========================================================

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [newPassword, setNewPassword] =
    useState("")

  const [adminPassword, setAdminPassword] =
    useState("")

  // =========================================================
  // ADMIN USER
  // =========================================================

  const [targetUserId, setTargetUserId] =
    useState("")

  const [targetName, setTargetName] =
    useState("")

  const [targetEmail, setTargetEmail] =
    useState("")

  const [targetRole, setTargetRole] =
    useState("staff")

  const [targetPassword, setTargetPassword] =
    useState("")

  const [targetIsActive, setTargetIsActive] =
    useState(true)

  // =========================================================
  // SESSION
  // =========================================================

  const [targetSessionId, setTargetSessionId] =
    useState("")

  // =========================================================
  // DEVICE
  // =========================================================

  const [deviceId, setDeviceId] =
    useState("")

  // =========================================================
  // DATA
  // =========================================================

  const [user, setUser] =
    useState<User | null>(null)

  const [sessions, setSessions] =
    useState<Session[]>([])

  const [adminUsers, setAdminUsers] =
    useState<User[]>([])

  const [adminSessions, setAdminSessions] =
    useState<Session[]>([])

  // =========================================================
  // AUDIT
  // =========================================================

  const [auditLogs, setAuditLogs] =
    useState<unknown[]>([])

  // =========================================================
  // UI
  // =========================================================

  const [response, setResponse] =
    useState<TestResult | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [lastAction, setLastAction] =
    useState("")

  // =========================================================
  // DEVICE
  // =========================================================

  function getDeviceId() {
    if (typeof window === "undefined") {
      return ""
    }

    let id = localStorage.getItem(
      "deviceId"
    )

    if (!id) {
      id = crypto.randomUUID()

      localStorage.setItem(
        "deviceId",
        id
      )
    }

    return id
  }

  // =========================================================
  // REQUEST
  // =========================================================

  async function request(
    url: string,
    options?: RequestInit,
    action = ""
  ) {
    setLoading(true)
    setLastAction(action)

    try {
      const res = await apiFetch(
        url,
        options
      )

      const contentType =
        res.headers.get(
          "content-type"
        )

      const data =
        contentType?.includes(
          "application/json"
        )
          ? await res.json()
          : {
              success: res.ok,
              message:
                await res.text(),
            }

      setResponse(data)

      return {
        ok: res.ok,
        status: res.status,
        data,
      }
    } catch (error) {
      const data = {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Request failed",
      }

      setResponse(data)

      return {
        ok: false,
        status: 0,
        data,
      }
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // AUTH
  // =========================================================

  async function signup() {
    await request(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      },
      "SIGNUP"
    )
  }

  async function login() {
    const result =
      await request(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            deviceId:
              getDeviceId(),
            deviceName:
              typeof navigator !==
              "undefined"
                ? navigator.userAgent
                : "Unknown Device",
          }),
        },
        "LOGIN"
      )

    if (
      result.ok &&
      result.data?.user
    ) {
      setUser(
        result.data.user
      )

      await getSessions()
    }
  }

  async function refresh() {
    const result =
      await request(
        "/api/auth/refresh",
        {
          method: "POST",
        },
        "REFRESH"
      )

    if (
      result.ok &&
      result.data?.user
    ) {
      setUser(
        result.data.user
      )

      await getSessions()
    }
  }

  async function getProfile() {
    const result =
      await request(
        "/api/auth/me",
        {
          method: "GET",
        },
        "GET PROFILE"
      )

    if (
      result.ok &&
      result.data?.user
    ) {
      setUser(
        result.data.user
      )

      return true
    }

    setUser(null)
    setSessions([])

    return false
  }

  async function logout() {
    const result =
      await request(
        "/api/auth/logout",
        {
          method: "POST",
        },
        "LOGOUT"
      )

    if (result.ok) {
      setUser(null)
      setSessions([])
    }
  }

  // =========================================================
  // SESSIONS
  // =========================================================

  async function getSessions() {
    const result =
      await request(
        "/api/auth/sessions",
        {
          method: "GET",
        },
        "GET MY SESSIONS"
      )

    if (
      result.ok &&
      result.data?.sessions
    ) {
      setSessions(
        result.data.sessions
      )

      return true
    }

    setSessions([])

    return false
  }

  async function terminateSession(
    sessionId: string
  ) {
    const result =
      await request(
        `/api/auth/sessions/${sessionId}`,
        {
          method: "DELETE",
        },
        "TERMINATE MY SESSION"
      )

    if (result.ok) {
      await getSessions()
      await getProfile()
    }
  }

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  async function changePassword() {
    const result =
      await request(
        "/api/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword:
              password,
            newPassword,
          }),
        },
        "CHANGE PASSWORD"
      )

    if (result.ok) {
      setNewPassword("")
    }
  }

  // =========================================================
  // ADMIN USERS
  // =========================================================

  async function createAdminUser() {
    await request(
      "/api/admin/users",
      {
        method: "POST",
        body: JSON.stringify({
          name: targetName,
          email: targetEmail,
          password:
            targetPassword,
          role: targetRole,
        }),
      },
      "CREATE ADMIN USER"
    )
  }

  async function getAdminUsers() {
    const result =
      await request(
        "/api/admin/users?page=1&limit=50",
        {
          method: "GET",
        },
        "GET ADMIN USERS"
      )

    if (
      result.ok &&
      result.data?.users
    ) {
      setAdminUsers(
        result.data.users
      )
    }
  }

  async function getAdminUser() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    await request(
      `/api/admin/users/${targetUserId}`,
      {
        method: "GET",
      },
      "GET ADMIN USER"
    )
  }

  async function updateAdminUser() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name:
              targetName ||
              undefined,

            email:
              targetEmail ||
              undefined,

            role:
              targetRole,

            isActive:
              targetIsActive,
          }),
        },
        "UPDATE ADMIN USER"
      )

    if (result.ok) {
      await getAdminUsers()
    }
  }

  async function deactivateUser() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: false,
          }),
        },
        "DEACTIVATE USER"
      )

    if (result.ok) {
      await getAdminUsers()
    }
  }

  async function reactivateUser() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isActive: true,
          }),
        },
        "REACTIVATE USER"
      )

    if (result.ok) {
      await getAdminUsers()
    }
  }

  async function deleteUser() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}`,
        {
          method: "DELETE",
        },
        "DELETE / DEACTIVATE USER"
      )

    if (result.ok) {
      await getAdminUsers()
    }
  }

  // =========================================================
  // ADMIN PASSWORD RESET
  // =========================================================

  async function resetUserPassword() {
    if (
      !targetUserId ||
      !adminPassword
    ) {
      setResponse({
        success: false,
        message:
          "Target user ID and new password are required",
      })

      return
    }

    await request(
      `/api/admin/users/${targetUserId}/password`,
      {
        method: "PATCH",
        body: JSON.stringify({
          newPassword:
            adminPassword,
        }),
      },
      "ADMIN PASSWORD RESET"
    )
  }

  // =========================================================
  // ADMIN SESSIONS
  // =========================================================

  async function getAdminSessions() {
    if (!targetUserId) {
      setResponse({
        success: false,
        message:
          "Target user ID is required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}/sessions`,
        {
          method: "GET",
        },
        "GET USER SESSIONS"
      )

    if (
      result.ok &&
      result.data?.sessions
    ) {
      setAdminSessions(
        result.data.sessions
      )
    }
  }

  async function terminateAdminSession() {
    if (
      !targetUserId ||
      !targetSessionId
    ) {
      setResponse({
        success: false,
        message:
          "Target user ID and session ID are required",
      })

      return
    }

    const result =
      await request(
        `/api/admin/users/${targetUserId}/sessions/${targetSessionId}`,
        {
          method: "DELETE",
        },
        "ADMIN TERMINATE SESSION"
      )

    if (result.ok) {
      await getAdminSessions()
    }
  }

  // =========================================================
  // AUDIT LOGS
  // =========================================================

  async function getAuditLogs() {
    const result =
      await request(
        "/api/admin/audit-logs?page=1&limit=100",
        {
          method: "GET",
        },
        "GET AUDIT LOGS"
      )

    if (
      result.ok &&
      result.data?.logs
    ) {
      setAuditLogs(
        result.data.logs
      )
    }
  }

  // =========================================================
  // LOCKOUT TEST
  // =========================================================

  async function testWrongPassword() {
    await request(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password:
            "WrongPassword123!",
          deviceId:
            getDeviceId(),
          deviceName:
            "Lockout Test Device",
        }),
      },
      "WRONG PASSWORD TEST"
    )
  }

  // =========================================================
  // CSRF TEST
  // =========================================================

  async function testCsrf() {
    const res =
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
        }
      )

    const data =
      await res.json()

    setResponse(data)
    setLastAction(
      "CSRF TEST"
    )
  }

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    const id = getDeviceId()

    setDeviceId(id)

    getProfile()
  }, [])

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <section className="rounded-xl bg-black p-6 text-white">
          <h1 className="text-3xl font-bold">
            Auth Security Test Dashboard
          </h1>

          <p className="mt-2 text-gray-300">
            Test authentication, sessions,
            passwords, RBAC, lockout,
            CSRF and admin security.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">
              Device:{" "}
              {deviceId || "Loading..."}
            </span>

            {loading && (
              <span className="rounded-full bg-yellow-500 px-3 py-1 text-black">
                Loading...
              </span>
            )}

            {lastAction && (
              <span className="rounded-full bg-blue-500 px-3 py-1">
                {lastAction}
              </span>
            )}
          </div>
        </section>

        {/* AUTH INPUTS */}

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">
            Authentication Credentials
          </h2>

          <div className="grid gap-3 md:grid-cols-3">

            <input
              className="rounded-lg border p-3"
              placeholder="Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Current Password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

          </div>
        </section>

        {/* AUTH TESTS */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Authentication Tests
          </h2>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={signup}
              disabled={loading}
              className="btn bg-black"
            >
              Signup
            </button>

            <button
              onClick={login}
              disabled={loading}
              className="btn bg-blue-600"
            >
              Login
            </button>

            <button
              onClick={testWrongPassword}
              disabled={loading}
              className="btn bg-red-700"
            >
              Wrong Password
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              className="btn bg-purple-600"
            >
              Refresh
            </button>

            <button
              onClick={getProfile}
              disabled={loading}
              className="btn bg-green-600"
            >
              Get Profile
            </button>

            <button
              onClick={getSessions}
              disabled={loading}
              className="btn bg-orange-600"
            >
              Get Sessions
            </button>

            <button
              onClick={logout}
              disabled={loading}
              className="btn bg-red-600"
            >
              Logout
            </button>

            <button
              onClick={testCsrf}
              disabled={loading}
              className="btn bg-pink-600"
            >
              Test CSRF
            </button>

          </div>
        </section>

        {/* PASSWORD */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Password Security
          </h2>

          <div className="mb-4 max-w-xl">

            <input
              className="w-full rounded-lg border p-3"
              placeholder="New password"
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
            />

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={changePassword}
              disabled={loading}
              className="btn bg-indigo-600"
            >
              Change My Password
            </button>

            <button
              onClick={() =>
                setNewPassword(
                  password
                )
              }
              className="btn bg-gray-600"
            >
              Test Same Password
            </button>

          </div>

          <p className="mt-4 text-sm text-gray-500">
            Test password history by changing
            the password and then attempting to
            reuse an older password.
          </p>

        </section>

        {/* CURRENT USER */}

        {user && (
          <section className="rounded-xl bg-white p-6 shadow">

            <h2 className="mb-4 text-xl font-bold">
              Current User
            </h2>

            <pre className="overflow-auto rounded-lg bg-gray-100 p-4 text-sm">
              {JSON.stringify(
                user,
                null,
                2
              )}
            </pre>

          </section>
        )}

        {/* MY SESSIONS */}

        <section className="rounded-xl bg-white p-6 shadow">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-bold">
              My Sessions
            </h2>

            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
              {sessions.length} / 2
            </span>

          </div>

          {sessions.length === 0 ? (
            <p className="text-gray-500">
              No active sessions.
            </p>
          ) : (
            <div className="space-y-3">

              {sessions.map(
                (session) => {

                  const currentDevice =
                    session.deviceId ===
                    deviceId

                  return (
                    <div
                      key={
                        session.sessionId
                      }
                      className="rounded-xl border p-4"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="font-semibold">
                            {currentDevice
                              ? "Current Device"
                              : "Other Device"}
                          </p>

                          <p className="text-sm text-gray-500">
                            {session.deviceName ||
                              "Unknown device"}
                          </p>

                        </div>

                        {currentDevice && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                            Current
                          </span>
                        )}

                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">

                        <Info
                          label="Device ID"
                          value={
                            session.deviceId
                          }
                        />

                        <Info
                          label="Session ID"
                          value={
                            session.sessionId
                          }
                        />

                        <Info
                          label="Created"
                          value={
                            new Date(
                              session.createdAt
                            ).toLocaleString()
                          }
                        />

                        <Info
                          label="Last Used"
                          value={
                            session.lastUsedAt
                              ? new Date(
                                  session.lastUsedAt
                                ).toLocaleString()
                              : "Never"
                          }
                        />

                        <Info
                          label="Expires"
                          value={
                            new Date(
                              session.expiresAt
                            ).toLocaleString()
                          }
                        />

                      </div>

                      <button
                        onClick={() =>
                          terminateSession(
                            session.sessionId
                          )
                        }
                        disabled={loading}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
                      >
                        Terminate
                      </button>

                    </div>
                  )
                }
              )}

            </div>
          )}

        </section>

        {/* ADMIN TARGET */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Admin User Management
          </h2>

          <div className="grid gap-3 md:grid-cols-2">

            <input
              className="rounded-lg border p-3"
              placeholder="Target User ID"
              value={targetUserId}
              onChange={(e) =>
                setTargetUserId(
                  e.target.value
                )
              }
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Target Name"
              value={targetName}
              onChange={(e) =>
                setTargetName(
                  e.target.value
                )
              }
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Target Email"
              value={targetEmail}
              onChange={(e) =>
                setTargetEmail(
                  e.target.value
                )
              }
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Target Password"
              type="password"
              value={targetPassword}
              onChange={(e) =>
                setTargetPassword(
                  e.target.value
                )
              }
            />

            <select
              className="rounded-lg border p-3"
              value={targetRole}
              onChange={(e) =>
                setTargetRole(
                  e.target.value
                )
              }
            >
              <option value="staff">
                Staff
              </option>

              <option value="manager">
                Manager
              </option>

              <option value="admin">
                Admin
              </option>
            </select>

            <label className="flex items-center gap-3 rounded-lg border p-3">

              <input
                type="checkbox"
                checked={targetIsActive}
                onChange={(e) =>
                  setTargetIsActive(
                    e.target.checked
                  )
                }
              />

              Active

            </label>

          </div>

          <div className="mt-4 flex flex-wrap gap-3">

            <button
              onClick={createAdminUser}
              disabled={loading}
              className="btn bg-black"
            >
              Create User
            </button>

            <button
              onClick={getAdminUsers}
              disabled={loading}
              className="btn bg-blue-600"
            >
              List Users
            </button>

            <button
              onClick={getAdminUser}
              disabled={loading}
              className="btn bg-purple-600"
            >
              Get User
            </button>

            <button
              onClick={updateAdminUser}
              disabled={loading}
              className="btn bg-green-600"
            >
              Update User
            </button>

            <button
              onClick={deactivateUser}
              disabled={loading}
              className="btn bg-red-600"
            >
              Deactivate
            </button>

            <button
              onClick={reactivateUser}
              disabled={loading}
              className="btn bg-emerald-600"
            >
              Reactivate
            </button>

            <button
              onClick={deleteUser}
              disabled={loading}
              className="btn bg-red-800"
            >
              Delete / Deactivate
            </button>

          </div>

        </section>

        {/* ADMIN USERS */}

        {adminUsers.length > 0 && (
          <section className="rounded-xl bg-white p-6 shadow">

            <h2 className="mb-4 text-xl font-bold">
              Admin Users
            </h2>

            <div className="space-y-3">

              {adminUsers.map(
                (item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setTargetUserId(
                        item.id
                      )
                    }
                    className="block w-full rounded-lg border p-4 text-left hover:bg-gray-50"
                  >

                    <div className="flex justify-between">

                      <span className="font-semibold">
                        {item.name}
                      </span>

                      <span>
                        {item.role}
                      </span>

                    </div>

                    <p className="text-sm text-gray-500">
                      {item.email}
                    </p>

                    <p className="text-xs text-gray-400">
                      {item.isActive
                        ? "Active"
                        : "Inactive"}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-400">
                      {item.id}
                    </p>

                  </button>
                )
              )}

            </div>

          </section>
        )}

        {/* ADMIN PASSWORD RESET */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Admin Password Reset
          </h2>

          <div className="mb-4 max-w-xl">

            <input
              className="w-full rounded-lg border p-3"
              placeholder="New password for target user"
              type="password"
              value={adminPassword}
              onChange={(e) =>
                setAdminPassword(
                  e.target.value
                )
              }
            />

          </div>

          <button
            onClick={
              resetUserPassword
            }
            disabled={loading}
            className="btn bg-red-700"
          >
            Reset User Password
          </button>

        </section>

        {/* ADMIN SESSIONS */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Target User Sessions
          </h2>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={
                getAdminSessions
              }
              disabled={loading}
              className="btn bg-orange-600"
            >
              Get Target Sessions
            </button>

          </div>

          {adminSessions.length > 0 && (
            <div className="mt-4 space-y-3">

              {adminSessions.map(
                (session) => (
                  <div
                    key={
                      session.sessionId
                    }
                    className="rounded-lg border p-4"
                  >

                    <p className="font-semibold">
                      {session.deviceName ||
                        "Unknown device"}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      Session:
                      {" "}
                      {session.sessionId}
                    </p>

                    <button
                      onClick={() => {
                        setTargetSessionId(
                          session.sessionId
                        )
                      }}
                      className="mt-3 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
                    >
                      Select Session
                    </button>

                  </div>
                )
              )}

            </div>
          )}

          <div className="mt-4 flex gap-3">

            <input
              className="flex-1 rounded-lg border p-3"
              placeholder="Selected session ID"
              value={targetSessionId}
              onChange={(e) =>
                setTargetSessionId(
                  e.target.value
                )
              }
            />

            <button
              onClick={
                terminateAdminSession
              }
              disabled={loading}
              className="rounded-lg bg-red-700 px-4 py-2 text-white"
            >
              Terminate Target Session
            </button>

          </div>

        </section>

        {/* AUDIT */}

        <section className="rounded-xl bg-white p-6 shadow">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-xl font-bold">
              Audit Logs
            </h2>

            <button
              onClick={
                getAuditLogs
              }
              disabled={loading}
              className="btn bg-gray-800"
            >
              Load Audit Logs
            </button>

          </div>

          <pre className="max-h-[500px] overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-green-400">
            {JSON.stringify(
              auditLogs,
              null,
              2
            )}
          </pre>

        </section>

        {/* STORAGE */}

        <section className="rounded-xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-bold">
            Browser Storage
          </h2>

          <div className="space-y-3 rounded-lg bg-gray-100 p-4">

            <p>
              <strong>
                Access Token:
              </strong>{" "}
              HttpOnly Cookie
            </p>

            <p>
              <strong>
                Refresh Token:
              </strong>{" "}
              HttpOnly Cookie
            </p>

            <p>
              <strong>
                CSRF Token:
              </strong>{" "}
              Regular Cookie
            </p>

            <p className="break-all text-sm">
              <strong>
                Device ID:
              </strong>{" "}
              {deviceId ||
                "Loading..."}
            </p>

          </div>

        </section>

        {/* API RESPONSE */}

        <section className="rounded-xl bg-white p-6 shadow">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-xl font-bold">
              Latest API Response
            </h2>

            <button
              onClick={() =>
                setResponse(null)
              }
              className="rounded-lg bg-gray-200 px-3 py-2 text-sm"
            >
              Clear
            </button>

          </div>

          <pre className="min-h-40 overflow-auto rounded-lg bg-black p-4 text-sm text-green-400">
            {response
              ? JSON.stringify(
                  response,
                  null,
                  2
                )
              : "No response yet"}
          </pre>

        </section>

      </div>

      <style jsx>{`
        .btn {
          border-radius: 0.5rem;
          padding: 0.75rem 1.25rem;
          color: white;
          font-weight: 500;
        }

        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  )
}

// =========================================================
// INFO COMPONENT
// =========================================================

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-400">
        {label}
      </p>

      <p className="break-all text-sm text-gray-600">
        {value}
      </p>
    </div>
  )
}