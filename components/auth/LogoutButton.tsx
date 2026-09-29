"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface LogoutButtonProps {
  collapsed?: boolean;
}

export default function LogoutButton({
  collapsed = false,
}: LogoutButtonProps) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const handleLogout = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const response = await apiFetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Logout request failed"
        );
      }

      // Clear client-side session state if your
      // SessionProvider exposes a logout function.
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title={collapsed ? "Logout" : undefined}
      className={`
        group
        flex
        justify-between
        h-11
        w-full
        items-center
        rounded-xl
        text-[#f0ecec]
        transition-colors
        bg-black
        hover:bg-red-50
        hover:text-red-600

        dark:text-[#999]
        dark:hover:bg-red-950/30
        dark:hover:text-red-400

        disabled:pointer-events-none
        disabled:opacity-50

        ${
          collapsed
            ? "justify-center"
            : "px-3"
        }
      `}
    >
      

      {!collapsed && (
        <span className="ml-3 text-[13px] font-medium">
          {loading ? "Logging out..." : "Logout"}
        </span>
      )}
      {loading ? (
        <Loader2
          size={19}
          className="animate-spin"
        />
      ) : (
        <LogOut
          size={16}
          strokeWidth={1.8}
        />
      )}
    </button>
  );
}