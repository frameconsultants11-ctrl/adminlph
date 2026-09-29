import {
  NextRequest,
} from "next/server"

import {
  verifyCsrfToken,
} from "@/lib/csrf"

export function requireCsrf(
  req: NextRequest
) {
  if (!verifyCsrfToken(req)) {
    throw new Error(
      "Invalid CSRF token"
    )
  }
}