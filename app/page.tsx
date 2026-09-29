"use client"

import RequireAuth from "@/components/auth/require-auth"
import { useSession } from "@/lib/session-context"

function DashboardContent() {
  const { session } = useSession()

  return (
    <div>
      <h1>
        Welcome {session?.user.name}
      </h1>

      <p>
        Email: {session?.user.email}
      </p>

      <p>
        Role: {session?.user.role}
      </p>

      <p>
        Active:{" "}
        {session?.user.isActive
          ? "Yes"
          : "No"}
      </p>
    </div>
  )
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}