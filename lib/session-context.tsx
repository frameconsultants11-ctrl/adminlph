"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { apiFetch } from "@/lib/api-fetch"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "staff"
  isActive: boolean
}

export type Session = {
  user: SessionUser
}

type SessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"

type SessionContextType = {
  session: Session | null
  status: SessionStatus
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext =
  createContext<SessionContextType | null>(null)

export function SessionProvider({
  children,
}: {
  children: ReactNode
}) {
  const [session, setSession] =
    useState<Session | null>(null)

  const [status, setStatus] =
    useState<SessionStatus>("loading")

  async function loadSession() {
    try {
      setStatus("loading")

      const response = await apiFetch(
        "/api/auth/me",
        {
          method: "GET",
        }
      )

      if (!response.ok) {
        setSession(null)
        setStatus("unauthenticated")
        return
      }

      const data = await response.json()

      if (!data.success || !data.user) {
        setSession(null)
        setStatus("unauthenticated")
        return
      }

      setSession({
        user: data.user,
      })

      setStatus("authenticated")
    } catch (error) {
      console.error(
        "LOAD SESSION ERROR:",
        error
      )

      setSession(null)
      setStatus("unauthenticated")
    }
  }

  async function signOut() {
    try {
      await apiFetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      )
    } catch (error) {
      console.error(
        "SIGN OUT ERROR:",
        error
      )
    } finally {
      setSession(null)
      setStatus("unauthenticated")
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  return (
    <SessionContext.Provider
      value={{
        session,
        status,
        refresh: loadSession,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context =
    useContext(SessionContext)

  if (!context) {
    throw new Error(
      "useSession must be used inside SessionProvider"
    )
  }

  return context
}