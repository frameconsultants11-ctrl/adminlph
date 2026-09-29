"use client"

import {
  useEffect,
} from "react"

import {
  useRouter,
} from "next/navigation"

import {
  useSession,
} from "@/lib/session-context"

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const {
    session,
    status,
  } = useSession()

  useEffect(() => {
    if (
      status === "unauthenticated"
    ) {
      router.replace("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div>
        Loading...
      </div>
    )
  }

  if (!session) {
    return null
  }

  return children
}