"use client"

import {
  FormEvent,
  useState,
} from "react"

import {
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react"

import { useRouter } from "next/navigation"

import AuthInput from "@/components/auth/AuthInput"
import AuthButton from "@/components/auth/AuthButton"

import { apiFetch } from "@/lib/api-fetch"
import BackButton from "@/components/ui/BackButton"

type UserRole =
  | "admin"
  | "manager"
  | "staff"

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

export default function CreateUserPage() {
  const router = useRouter()

  const [name, setName] =
    useState("")

  const [email, setEmail] =
    useState("")

  const [role, setRole] =
    useState<UserRole>("staff")

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
    useState("")

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setError("")
    setSuccess("")

    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!name.trim()) {
      setError(
        "Please enter the user's name."
      )
      return
    }

    if (!email.trim()) {
      setError(
        "Please enter the user's email."
      )
      return
    }

    if (!password) {
      setError(
        "Please enter a password."
      )
      return
    }

    const passwordError =
      validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      )
      return
    }

    try {
      setLoading(true)

      // -------------------------------
      // CREATE USER
      // -------------------------------

      const response =
        await apiFetch(
          "/api/admin/users",
          {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              email: email
                .trim()
                .toLowerCase(),
              password,
              role,
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
            "Unable to create user."
        )
        return
      }

      setSuccess(
        "User created successfully."
      )

      setTimeout(() => {
        router.push("/users")
      }, 700)
    } catch (error) {
      console.error(
        "CREATE USER ERROR:",
        error
      )

      setError(
        "Unable to create user. Please try again."
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
      {/* HEADER */}

      <BackButton />

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
          Create User
        </h1>

        <p
          className="
            mt-1
            text-[12px]
            text-[#888]
            dark:text-[#777]
          "
        >
          Add a new user to your
          organization.
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
        {/* ACCOUNT */}

        <div
          className="
            border-b
            border-[#eeeeee]
            px-4
            py-5

            sm:px-6

            dark:border-[#2a2a2a]
          "
        >
          <div className="mb-5">
            <h2
              className="
                text-[13px]
                font-semibold
                text-[#222]

                dark:text-white
              "
            >
              Account Information
            </h2>

            <p
              className="
                mt-1
                text-[11px]
                text-[#999]

                dark:text-[#777]
              "
            >
              Basic information for
              the new user.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* NAME */}

            <AuthInput
              id="name"
              name="name"
              label="Full name"
              placeholder="John Doe"
              autoComplete="name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              leftIcon={
                <UserRound
                  size={16}
                />
              }
            />

            {/* EMAIL */}

            <AuthInput
              id="email"
              name="email"
              type="email"
              label="Email"
              placeholder="john@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              leftIcon={
                <Mail
                  size={16}
                />
              }
            />

            {/* ROLE */}

            <div>
              <label
                htmlFor="role"
                className="
                  mb-2
                  block
                  text-[12px]
                  font-medium
                  text-[#262626]

                  dark:text-[#ddd]
                "
              >
                Role
              </label>

              <select
                id="role"
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target
                      .value as UserRole
                  )
                }
                className="
                  h-[42px]
                  w-full
                  rounded-xl
                  border
                  border-[#e5e5e5]
                  bg-white
                  px-4
                  text-[12px]
                  text-[#333]
                  outline-none
                  transition

                  focus:border-[#111]
                  focus:ring-2
                  focus:ring-[#111]/5

                  dark:border-[#333]
                  dark:bg-[#202020]
                  dark:text-[#ddd]

                  dark:focus:border-[#555]
                  dark:focus:ring-white/5
                "
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
            </div>
          </div>
        </div>

        {/* PASSWORD */}

        <div
          className="
            px-4
            py-5

            sm:px-6
          "
        >
          <div className="mb-5">
            <h2
              className="
                text-[13px]
                font-semibold
                text-[#222]

                dark:text-white
              "
            >
              Password
            </h2>

            <p
              className="
                mt-1
                text-[11px]
                text-[#999]

                dark:text-[#777]
              "
            >
              Set the initial password
              for this user.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* PASSWORD */}

            <AuthInput
              id="password"
              name="password"
              type="password"
              label="Password"
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

            {/* CONFIRM PASSWORD */}

            <AuthInput
              id="confirmPassword"
              name="confirmPassword"
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

          {/* PASSWORD HINT */}

          <div
            className="
              mt-3
              rounded-lg
              bg-[#fafafa]
              px-3
              py-2.5

              dark:bg-[#1c1c1c]
            "
          >
            <p
              className="
                text-[10px]
                leading-5
                text-[#888]

                dark:text-[#777]
              "
            >
              Password must contain at
              least 8 characters, one
              uppercase letter, one
              lowercase letter, and one
              number.
            </p>
          </div>
        </div>

        {/* MESSAGES */}

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
                {success}
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
              router.push("/users")
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
            loadingText="Creating..."
          >
            Create User
          </AuthButton>
        </div>
      </form>
    </div>
  )
}