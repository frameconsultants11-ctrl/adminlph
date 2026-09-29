import { getDb } from "@/lib/db"

const WINDOW_MS = 15 * 60 * 1000

const MAX_FAILURES = 5

export type LoginFailureResult = {
  allowed: boolean
  attempts: number
  remaining: number
  retryAfter: number
}

function createKey(
  email: string,
  ip: string
) {
  return `account:${email}:ip:${ip}`
}

export async function recordLoginFailure(
  email: string,
  ip: string
): Promise<LoginFailureResult> {
  const db = await getDb()

  const collection =
    db.collection("login_failure_limits")

  const key = createKey(
    email,
    ip
  )

  const now = new Date()

  const existing =
    await collection.findOne({
      key,
      expiresAt: {
        $gt: now,
      },
    })

  /*
   * First failure
   */
  if (!existing) {
    await collection.insertOne({
      key,
      email,
      ip,
      attempts: 1,
      createdAt: now,
      expiresAt: new Date(
        Date.now() + WINDOW_MS
      ),
    })

    return {
      allowed: true,
      attempts: 1,
      remaining:
        MAX_FAILURES - 1,
      retryAfter:
        Math.ceil(
          WINDOW_MS / 1000
        ),
    }
  }

  const attempts =
    Number(existing.attempts || 0) + 1

  await collection.updateOne(
    {
      _id: existing._id,
    },
    {
      $set: {
        attempts,
      },
    }
  )

  const retryAfter =
    Math.max(
      0,
      Math.ceil(
        (
          new Date(
            existing.expiresAt
          ).getTime() -
          Date.now()
        ) / 1000
      )
    )

  if (
    attempts >= MAX_FAILURES
  ) {
    return {
      allowed: false,
      attempts,
      remaining: 0,
      retryAfter,
    }
  }

  return {
    allowed: true,
    attempts,
    remaining:
      MAX_FAILURES - attempts,
    retryAfter,
  }
}

export async function clearLoginFailures(
  email: string,
  ip: string
) {
  const db = await getDb()

  const collection =
    db.collection("login_failure_limits")

  await collection.deleteOne({
    key: createKey(
      email,
      ip
    ),
  })
}