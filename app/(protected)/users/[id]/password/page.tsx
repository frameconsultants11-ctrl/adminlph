"use client"

import {
  FormEvent,
  useState,
} from "react"

import {
  Check,
  LockKeyhole,
} from "lucide-react"

import {
  useParams,
  useRouter,
} from "next/navigation"

import AuthInput from "@/components/auth/AuthInput"
import AuthButton from "@/components/auth/AuthButton"
import BackButton from "@/components/ui/BackButton"

import { apiFetch } from "@/lib/api-fetch"

function validatePassword(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters"
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter"
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter"
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number"
  }

  return ""
}

export default function ResetPasswordPage() {
  const params = useParams()

  const router = useRouter()

  const id = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id ?? ""

  const [password, setPassword] =
    useState("")

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("")

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState("")

  const [success, setSuccess] =
    useState(false)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError("")
    setSuccess(false)

    if (!id) {
      setError("Invalid user ID.")
      return
    }

    if (!password) {
      setError(
        "Please enter a new password."
      )
      return
    }

    const passwordError =
      validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      )
      return
    }

    try {
      setLoading(true)

      const response =
        await apiFetch(
          `/api/admin/users/${encodeURIComponent(
            id
          )}/password`,
          {
            method: "PATCH",
            body: JSON.stringify({
              newPassword:password,
            }),
          }
        )

      const data =
        await response
          .json()
          .catch(() => null)

      if (!response.ok) {
        setError(
          data?.message ||
            "Unable to reset password."
        )
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push(`/users/${id}`)
      }, 900)
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error
      )

      setError(
        "Unable to reset password. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="
        mx-auto
        w-full
        px-4
        py-8

        sm:px-8
        sm:py-10

        lg:px-16
        lg:py-16

        text-[#111]
        dark:text-white
      "
    >
      {/* BACK */}

      <BackButton
        href={`/users/${id}`}
        label="Back to user"
      />

      {/* HEADER */}

      <div className="mb-6">
        <h1
          className="
            text-[22px]
            font-semibold
            tracking-[-0.02em]
            text-[#111]

            dark:text-white
          "
        >
          Reset Password
        </h1>

        <p
          className="
            mt-1
            text-[12px]
            text-[#888]

            dark:text-[#777]
          "
        >
          Set a new password for this
          user account.
        </p>
      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
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
        {/* PASSWORD SECTION */}

        <div
          className="
            px-4
            py-6

            sm:px-6
          "
        >
          <div className="mb-5">
            <div className="flex items-center gap-2">

              {/* ICON */}

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-[#f5f5f5]

                  dark:bg-[#242424]
                "
              >
                <LockKeyhole
                  size={15}
                  className="
                    text-[#666]
                    dark:text-[#aaa]
                  "
                />
              </div>

              {/* TITLE */}

              <div>
                <h2
                  className="
                    text-[13px]
                    font-semibold
                    text-[#222]

                    dark:text-white
                  "
                >
                  New Password
                </h2>

                <p
                  className="
                    mt-0.5
                    text-[10px]
                    text-[#999]

                    dark:text-[#777]
                  "
                >
                  Create a new secure
                  password.
                </p>
              </div>

            </div>
          </div>

          {/* PASSWORD INPUTS */}

          <div className="grid gap-5 md:grid-cols-2">

            <AuthInput
              id="password"
              name="password"
              type="password"
              label="New password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              leftIcon={
                <LockKeyhole
                  size={16}
                />
              }
              showPasswordToggle
            />

            <AuthInput
              id="confirm-password"
              name="confirm-password"
              type="password"
              label="Confirm password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              leftIcon={
                <LockKeyhole
                  size={16}
                />
              }
              showPasswordToggle
            />

          </div>

          {/* PASSWORD RULES */}

          <div
            className="
              mt-5
              rounded-lg
              bg-[#fafafa]
              px-4
              py-3

              dark:bg-[#1c1c1c]
            "
          >
            <p
              className="
                mb-2
                text-[10px]
                font-medium
                text-[#555]

                dark:text-[#ccc]
              "
            >
              Password requirements
            </p>

            <div className="grid gap-1.5 sm:grid-cols-2">

              <PasswordRule
                valid={
                  password.length >= 8
                }
              >
                At least 8 characters
              </PasswordRule>

              <PasswordRule
                valid={
                  /[A-Z]/.test(password)
                }
              >
                One uppercase letter
              </PasswordRule>

              <PasswordRule
                valid={
                  /[a-z]/.test(password)
                }
              >
                One lowercase letter
              </PasswordRule>

              <PasswordRule
                valid={
                  /[0-9]/.test(password)
                }
              >
                One number
              </PasswordRule>

            </div>
          </div>

          {/* WARNING */}

          <div
            className="
              mt-4
              rounded-lg
              border
              border-[#eeeeee]
              bg-[#fafafa]
              px-4
              py-3

              dark:border-[#2a2a2a]
              dark:bg-[#1c1c1c]
            "
          >
            <p
              className="
                text-[10px]
                leading-5
                text-[#777]

                dark:text-[#888]
              "
            >
              Resetting the password will
              invalidate the user's active
              sessions. They will need to
              sign in again on their devices.
            </p>
          </div>
        </div>

        {/* ERROR / SUCCESS */}

        {(error || success) && (
          <div
            className="
              px-4
              pb-5

              sm:px-6
            "
          >
            {error && (
              <div
                className="
                  rounded-lg
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-2.5
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

            {success && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-green-200
                  bg-green-50
                  px-3
                  py-2.5
                  text-[11px]
                  text-green-700

                  dark:border-green-900/50
                  dark:bg-green-950/20
                  dark:text-green-400
                "
              >
                <Check size={14} />

                <span>
                  Password reset
                  successfully. Active
                  sessions have been
                  invalidated.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}

        <div
          className="
            flex
            flex-col-reverse
            gap-2
            border-t
            border-[#eeeeee]
            bg-[#fafafa]
            px-4
            py-4

            sm:flex-row
            sm:items-center
            sm:justify-end
            sm:px-6

            dark:border-[#2a2a2a]
            dark:bg-[#1c1c1c]
          "
        >
          <AuthButton
            type="button"
            variant="outline"
            size="sm"
            fullWidth={false}
            disabled={loading}
            onClick={() =>
              router.push(
                `/users/${id}`
              )
            }
          >
            Cancel
          </AuthButton>

          <AuthButton
            type="submit"
            variant="secondary"
            size="sm"
            fullWidth={false}
            loading={loading}
            loadingText="Resetting..."
          >
            <Check size={13} />
            Reset Password
          </AuthButton>
        </div>
      </form>
    </div>
  )
}

/* =========================================================
   PASSWORD RULE
========================================================= */

function PasswordRule({
  valid,
  children,
}: {
  valid: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`
        flex
        items-center
        gap-2
        text-[10px]

        ${
          valid
            ? "text-green-600 dark:text-green-400"
            : "text-[#999] dark:text-[#777]"
        }
      `}
    >
      <span
        className={`
          flex
          h-3.5
          w-3.5
          items-center
          justify-center
          rounded-full
          border

          ${
            valid
              ? `
                border-green-500
                bg-green-500
                text-white
              `
              : `
                border-[#d8d8d8]
                dark:border-[#444]
              `
          }
        `}
      >
        {valid && (
          <Check size={9} />
        )}
      </span>

      {children}
    </div>
  )
}