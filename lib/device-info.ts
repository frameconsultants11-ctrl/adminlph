export function getDeviceLabel(
  userAgent: string
) {
  const ua = userAgent.toLowerCase()

  // Browser
  let browser = "Unknown browser"

  if (
    ua.includes("edg/")
  ) {
    browser = "Microsoft Edge"
  } else if (
    ua.includes("chrome/") &&
    !ua.includes("edg/")
  ) {
    browser = "Google Chrome"
  } else if (
    ua.includes("firefox/")
  ) {
    browser = "Mozilla Firefox"
  } else if (
    ua.includes("safari/") &&
    !ua.includes("chrome/")
  ) {
    browser = "Safari"
  } else if (
    ua.includes("opr/") ||
    ua.includes("opera")
  ) {
    browser = "Opera"
  }

  // Operating system
  let os = "Unknown device"

  if (ua.includes("windows")) {
    os = "Windows"
  } else if (
    ua.includes("macintosh") ||
    ua.includes("mac os")
  ) {
    os = "macOS"
  } else if (
    ua.includes("android")
  ) {
    os = "Android"
  } else if (
    ua.includes("iphone")
  ) {
    os = "iPhone"
  } else if (
    ua.includes("ipad")
  ) {
    os = "iPad"
  } else if (
    ua.includes("linux")
  ) {
    os = "Linux"
  }

  return `${browser} on ${os}`
}