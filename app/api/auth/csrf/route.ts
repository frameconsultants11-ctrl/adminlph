import {
  NextResponse,
} from "next/server"

import {
  generateCsrfToken,
} from "@/lib/csrf"

export async function GET() {
  const csrfToken =
    generateCsrfToken()

  const response =
    NextResponse.json({
      success: true,
    })

  response.cookies.set(
    "csrfToken",
    csrfToken,
    {
      httpOnly: false,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    }
  )

  return response
}