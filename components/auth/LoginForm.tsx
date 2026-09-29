"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  LockKeyhole,
} from "lucide-react";

import AuthInput from "./AuthInput";
import AuthButton from "./AuthButton";
import { apiFetch } from "@/lib/api-fetch";
import { getDeviceId } from "@/app/(protected)/dashboard/page";
import { useSession } from "@/lib/session-context";

export default function LoginForm() {
  const router = useRouter();
const { refresh } = useSession()
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!email.trim()) {
      setError(
        "Please enter your email."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    try {
      setLoading(true);

      // ==================================================
      // LOGIN API
      // ==================================================

      const response = await apiFetch(
        "/api/auth/login",
        {
          method: "POST",
credentials: "include",
          body: JSON.stringify({
            email: email.trim(),
            password,
            deviceId: getDeviceId(),
            deviceName:
              navigator.userAgent,
          }),
        }
      );

      // ==================================================
      // RESPONSE
      // ==================================================

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ||
            "Invalid email or password."
        );

        return;
      }

      // ==================================================
      // LOGIN SUCCESS
      // ==================================================

      console.log(
        "LOGIN SUCCESS:",
        data
      );

  await refresh()
      router.replace("/dashboard");

    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setError(
        "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      {/* ==================================================
          EMAIL
      ================================================== */}

      <AuthInput
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(event) =>
          setEmail(event.target.value)
        }
        leftIcon={
          <Mail
            size={16}
            strokeWidth={1.8}
          />
        }
      />

      {/* ==================================================
          PASSWORD
      ================================================== */}

      <AuthInput
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(event) =>
          setPassword(
            event.target.value
          )
        }
        leftIcon={
          <LockKeyhole
            size={16}
            strokeWidth={1.8}
          />
        }
        showPasswordToggle
      />

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div
          className="
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-3
            py-2
            text-[11px]
            text-red-600
          "
        >
          {error}
        </div>
      )}

      {/* ==================================================
          REMEMBER ME
      ================================================== */}

      <div className="flex items-center">

        <label
          className="
            flex
            cursor-pointer
            items-center
            gap-2
          "
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) =>
              setRememberMe(
                event.target.checked
              )
            }
            className="
              h-3.5
              w-3.5
              rounded
              border-[#ccc]
              accent-[#24c131]
            "
          />

          <span
            className="
              text-[10px]
              text-[#777]
            "
          >
            Remember me
          </span>
        </label>

      </div>

      {/* ==================================================
          LOGIN BUTTON
      ================================================== */}

      <AuthButton
        type="submit"
        loading={loading}
        loadingText="Signing In..."
      >
        Sign In
      </AuthButton>

    </form>
  );
}