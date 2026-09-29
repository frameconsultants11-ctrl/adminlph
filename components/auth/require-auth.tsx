"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useSession } from "@/lib/session-context"

type RequireAuthProps = {
  children: React.ReactNode
}

export default function RequireAuth({
  children,
}: RequireAuthProps) {
  const router = useRouter()

  const {
    session,
    status,
  } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  // Checking session
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  // Not logged in
  if (status === "unauthenticated") {
    return null
  }

  // Logged in
  return <>{children}</>
}