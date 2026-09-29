export function getLoginDelay(
  failedAttempts: number
) {
  if (failedAttempts <= 0) {
    return 0
  }

  if (failedAttempts === 1) {
    return 500
  }

  if (failedAttempts === 2) {
    return 1000
  }

  if (failedAttempts === 3) {
    return 2000
  }

  if (failedAttempts === 4) {
    return 4000
  }

  return 5000
}

export async function applyLoginDelay(
  failedAttempts: number
) {
  const delay =
    getLoginDelay(
      failedAttempts
    )

  if (!delay) {
    return
  }

  await new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        delay
      )
  )
}