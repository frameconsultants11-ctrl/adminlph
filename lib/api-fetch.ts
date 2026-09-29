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


// ======================================================
// CSRF
// ======================================================

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


// ======================================================
// METHODS
// ======================================================

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


// ======================================================
// AUTH ENDPOINT CHECK
// ======================================================

function shouldTryRefresh(
  url: string
) {
  return (
    !url.includes("/api/auth/login") &&
    !url.includes("/api/auth/signup") &&
    !url.includes("/api/auth/refresh") &&
    !url.includes("/api/auth/logout")
  )
}


// ======================================================
// SHARED REFRESH PROMISE
//
// IMPORTANT:
//
// Only ONE refresh request can run at a time.
//
// If 5 API requests receive 401 at the same
// time, all 5 wait for this same promise.
// ======================================================

let refreshPromise:
  Promise<boolean> | null = null


async function refreshAccessToken(): Promise<boolean> {

  // ================================================
  // REFRESH ALREADY RUNNING
  // ================================================

  if (refreshPromise) {
    return refreshPromise
  }


  // ================================================
  // START REFRESH
  // ================================================

  refreshPromise = (async () => {

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

            credentials:
              "include",

            headers:
              refreshHeaders,
          }
        )


      // ==========================================
      // REFRESH FAILED
      // ==========================================

      if (!refreshResponse.ok) {

        console.error(
          "REFRESH FAILED:",
          refreshResponse.status
        )

        return false
      }


      // ==========================================
      // REFRESH SUCCESS
      // ==========================================

      return true

    } catch (error) {

      console.error(
        "TOKEN REFRESH ERROR:",
        error
      )

      return false

    } finally {

      // ==========================================
      // IMPORTANT
      //
      // Allow a future refresh after this one
      // has completed.
      // ==========================================

      refreshPromise = null
    }

  })()


  return refreshPromise
}


// ======================================================
// API FETCH
// ======================================================

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {

  const method = (
    options.method ||
    "GET"
  ).toUpperCase()


  // ==================================================
  // HEADERS
  // ==================================================

  const headers =
    new Headers(
      options.headers
    )


  // ==================================================
  // FORMDATA CHECK
  // ==================================================

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData


  // ==================================================
  // JSON CONTENT TYPE
  // ==================================================

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


  // ==================================================
  // CSRF
  // ==================================================

  if (
    isStateChangingMethod(
      method
    )
  ) {

    const csrfToken =
      await ensureCsrfToken()

    headers.set(
      "x-csrf-token",
      csrfToken
    )
  }


  // ==================================================
  // FIRST REQUEST
  // ==================================================

  let response =
    await fetch(
      url,
      {
        ...options,

        method,

        credentials:
          "include",

        headers,
      }
    )


  // ==================================================
  // NO REFRESH NEEDED
  // ==================================================

  if (
    response.status !== 401 ||
    !shouldTryRefresh(url)
  ) {
    return response
  }


  // ==================================================
  // ACCESS TOKEN EXPIRED
  //
  // Use the shared refresh lock.
  // ==================================================

  const refreshed =
    await refreshAccessToken()


  // ==================================================
  // REFRESH FAILED
  // ==================================================

  if (!refreshed) {
    return response
  }


  // ==================================================
  // REFRESH SUCCESS
  //
  // Re-read CSRF token.
  // ==================================================

  if (
    isStateChangingMethod(
      method
    )
  ) {

    const newCsrfToken =
      await ensureCsrfToken()

    headers.set(
      "x-csrf-token",
      newCsrfToken
    )
  }


  // ==================================================
  // RETRY ORIGINAL REQUEST
  // ==================================================

  response =
    await fetch(
      url,
      {
        ...options,

        method,

        credentials:
          "include",

        headers,
      }
    )


  return response
}