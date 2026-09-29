export function getLockoutDuration(
  failedAttempts: number
) {
  if (failedAttempts >= 15) {
    return 24 * 60 * 60 * 1000
  }

  if (failedAttempts >= 10) {
    return 60 * 60 * 1000
  }

  if (failedAttempts >= 5) {
    return 15 * 60 * 1000
  }

  return 0
}