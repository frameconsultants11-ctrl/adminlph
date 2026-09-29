// lib/api-fetch.ts

function getCsrfToken() {
  if (typeof document === "undefined") {
    return null
  }

  const match = document.cookie.match(
    /(?:^|;\s*)csrfToken=([^;]+)/
  )

  return match
    ? decodeURIComponent(match[1])
    : null
}

async function ensureCsrfToken() {
  let token = getCsrfToken()

  if (token) {
    return token
  }

  const response = await fetch(
    "/api/auth/csrf",
    {
      method: "GET",
      credentials: "include",
    }
  )

  if (!response.ok) {
    throw new Error(
      "Unable to get CSRF token"
    )
  }

  token = getCsrfToken()

  if (!token) {
    throw new Error(
      "CSRF token not found"
    )
  }

  return token
}

function isStateChangingMethod(
  method?: string
) {
  return [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ].includes(
    (method || "GET").toUpperCase()
  )
}

function shouldTryRefresh(url: string) {
  return (
    !url.includes("/api/auth/login") &&
    !url.includes("/api/auth/signup") &&
    !url.includes("/api/auth/refresh") &&
    !url.includes("/api/auth/logout")
  )
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (
    options.method || "GET"
  ).toUpperCase()

  const headers = new Headers(
    options.headers
  )

  /*
   * Only set JSON Content-Type when
   * the body is NOT FormData.
   *
   * For FormData, the browser automatically
   * sets:
   *
   * multipart/form-data; boundary=...
   */
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData

  if (
    options.body &&
    !isFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    )
  }

  /*
   * Add CSRF token to every
   * state-changing request.
   */
  if (
    isStateChangingMethod(method)
  ) {
    const csrfToken =
      await ensureCsrfToken()

    headers.set(
      "x-csrf-token",
      csrfToken
    )
  }

  /*
   * First request
   */
  let response = await fetch(url, {
    ...options,
    method,
    credentials: "include",
    headers,
  })

  /*
   * Don't refresh if:
   *
   * - request succeeded
   * - response isn't 401
   * - this is already an auth endpoint
   */
  if (
    response.status !== 401 ||
    !shouldTryRefresh(url)
  ) {
    return response
  }

  /*
   * ACCESS TOKEN EXPIRED
   *
   * Try refresh.
   */
  try {
    const csrfToken =
      await ensureCsrfToken()

    const refreshHeaders =
      new Headers()

    refreshHeaders.set(
      "x-csrf-token",
      csrfToken
    )

    const refreshResponse =
      await fetch(
        "/api/auth/refresh",
        {
          method: "POST",
          credentials: "include",
          headers: refreshHeaders,
        }
      )

    /*
     * Refresh failed.
     */
    if (!refreshResponse.ok) {
      console.error(
        "REFRESH FAILED:",
        refreshResponse.status
      )

      return response
    }

    /*
     * Refresh succeeded.
     *
     * Re-read CSRF token and retry
     * the original request.
     */
    if (
      isStateChangingMethod(method)
    ) {
      const newCsrfToken =
        await ensureCsrfToken()

      headers.set(
        "x-csrf-token",
        newCsrfToken
      )
    }

    /*
     * IMPORTANT:
     *
     * Do NOT add Content-Type here.
     *
     * If the original request used FormData,
     * fetch() will generate the multipart
     * boundary again.
     */
    response = await fetch(url, {
      ...options,
      method,
      credentials: "include",
      headers,
    })

    return response
  } catch (error) {
    console.error(
      "TOKEN REFRESH ERROR:",
      error
    )

    return response
  }
}