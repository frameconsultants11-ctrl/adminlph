import { getDb } from "@/lib/db"

const WINDOW_MS =
  15 * 60 * 1000

const MAX_IP_ATTEMPTS = 10
const MAX_ACCOUNT_IP_ATTEMPTS = 5

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}


// ======================================================
// KEY
// ======================================================

function getKey(
  type: "ip" | "account-ip",
  ip: string,
  email?: string
) {
  if (type === "ip") {
    return `ip:${ip}`
  }

  return `account-ip:${email
    ?.toLowerCase()
    .trim()}:${ip}`
}


// ======================================================
// CHECK LIMIT
// ======================================================

async function checkLimit(
  type: "ip" | "account-ip",
  ip: string,
  email?: string
): Promise<RateLimitResult> {

  const db =
    await getDb()

  const collection =
    db.collection(
      "login_rate_limits"
    )

  const key =
    getKey(
      type,
      ip,
      email
    )

  const maxAttempts =
    type === "ip"
      ? MAX_IP_ATTEMPTS
      : MAX_ACCOUNT_IP_ATTEMPTS

  const now =
    new Date()

  // ====================================================
  // FIND EXISTING ACTIVE LIMIT
  // ====================================================

  const existing =
    await collection.findOne({
      key,
      expiresAt: {
        $gt: now,
      },
    })


  // ====================================================
  // NO ACTIVE LIMIT
  // ====================================================

  if (!existing) {

    const expiresAt =
      new Date(
        Date.now() +
          WINDOW_MS
      )

    try {

      await collection.updateOne(
        {
          key,
        },
        {
          $set: {
            key,
            attempts: 1,
            expiresAt,
          },
        },
        {
          upsert: true,
        }
      )

    } catch (error: any) {

      // Another simultaneous request
      // may have created the document.

      if (
        error?.code === 11000
      ) {

        const retry =
          await collection.findOne({
            key,
          })

        if (!retry) {
          throw error
        }

        const attempts =
          Number(
            retry.attempts || 0
          )

        if (
          attempts >=
          maxAttempts
        ) {

          const retryAfter =
            Math.max(
              0,
              Math.ceil(
                (
                  new Date(
                    retry.expiresAt
                  ).getTime() -
                  Date.now()
                ) / 1000
              )
            )

          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds:
              retryAfter,
          }
        }

        await collection.updateOne(
          {
            _id: retry._id,
          },
          {
            $inc: {
              attempts: 1,
            },
          }
        )

        return {
          allowed: true,
          remaining:
            maxAttempts -
            attempts -
            1,
          retryAfterSeconds:
            Math.max(
              0,
              Math.ceil(
                (
                  new Date(
                    retry.expiresAt
                  ).getTime() -
                  Date.now()
                ) / 1000
              )
            ),
        }
      }

      throw error
    }

    return {
      allowed: true,
      remaining:
        maxAttempts - 1,
      retryAfterSeconds:
        Math.ceil(
          WINDOW_MS / 1000
        ),
    }
  }


  // ====================================================
  // EXISTING ACTIVE LIMIT
  // ====================================================

  const attempts =
    Number(
      existing.attempts || 0
    )


  // ====================================================
  // LIMIT REACHED
  // ====================================================

  if (
    attempts >=
    maxAttempts
  ) {

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

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds:
        retryAfter,
    }
  }


  // ====================================================
  // INCREMENT
  // ====================================================

  await collection.updateOne(
    {
      _id: existing._id,
      attempts: {
        $lt: maxAttempts,
      },
    },
    {
      $inc: {
        attempts: 1,
      },
    }
  )


  return {
    allowed: true,
    remaining:
      maxAttempts -
      attempts -
      1,

    retryAfterSeconds:
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
      ),
  }
}


// ======================================================
// IP LIMIT
// ======================================================

export async function checkLoginIpLimit(
  ip: string
) {
  return checkLimit(
    "ip",
    ip
  )
}


// ======================================================
// ACCOUNT + IP LIMIT
// ======================================================

export async function checkLoginAccountIpLimit(
  ip: string,
  email: string
) {
  return checkLimit(
    "account-ip",
    ip,
    email
  )
}