import { getDb } from "@/lib/db"

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfter: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

export async function checkLoginRateLimit(
  ip: string
): Promise<RateLimitResult> {
  const db = await getDb()

  const collection =
    db.collection("login_rate_limits")

  const now = Date.now()

  const record =
    await collection.findOne({
      ip,
    })

  // No previous attempts
  if (!record) {
    await collection.insertOne({
      ip,
      attempts: 1,
      windowStart: new Date(now),
      expiresAt: new Date(
        now + WINDOW_MS
      ),
    })

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfter: 0,
    }
  }

  const windowStart =
    new Date(record.windowStart).getTime()

  // Window expired
  if (
    now - windowStart >= WINDOW_MS
  ) {
    await collection.updateOne(
      { _id: record._id },
      {
        $set: {
          attempts: 1,
          windowStart: new Date(now),
          expiresAt: new Date(
            now + WINDOW_MS
          ),
        },
      }
    )

    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      retryAfter: 0,
    }
  }

  // Limit reached
  if (record.attempts >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (windowStart +
        WINDOW_MS -
        now) /
        1000
    )

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    }
  }

  // Increment attempts
  await collection.updateOne(
    { _id: record._id },
    {
      $inc: {
        attempts: 1,
      },
    }
  )

  return {
    allowed: true,
    remaining:
      MAX_ATTEMPTS -
      record.attempts -
      1,
    retryAfter: 0,
  }
} 

const REFRESH_WINDOW_MS =
  15 * 60 * 1000

const MAX_REFRESH_ATTEMPTS = 30

export async function checkRefreshRateLimit(
  key: string
): Promise<RateLimitResult> {
  const db = await getDb();

  const collection = db.collection("refresh_rate_limits");

  const now = Date.now();

  // -----------------------------------------
  // 1. Try to find existing record
  // -----------------------------------------

  let record = await collection.findOne({ key });

  // -----------------------------------------
  // 2. Create first record
  // -----------------------------------------

  if (!record) {
    try {
      await collection.insertOne({
        key,
        attempts: 1,
        windowStart: new Date(now),
        expiresAt: new Date(now + REFRESH_WINDOW_MS),
      });

      return {
        allowed: true,
        remaining: MAX_REFRESH_ATTEMPTS - 1,
        retryAfter: 0,
      };
    } catch (error: any) {
      if (error?.code !== 11000) {
        throw error;
      }

      // Re-read the record created by the
      // concurrent request.
      record = await collection.findOne({ key });

      if (!record) {
        throw error;
      }
    }
  }

  // -----------------------------------------
  // 3. Check current window
  // -----------------------------------------

  const windowStart = new Date(
    record.windowStart
  ).getTime();

  // -----------------------------------------
  // 4. Window expired → reset
  // -----------------------------------------

  if (
    now - windowStart >=
    REFRESH_WINDOW_MS
  ) {
    await collection.updateOne(
      { _id: record._id },
      {
        $set: {
          attempts: 1,
          windowStart: new Date(now),
          expiresAt: new Date(
            now + REFRESH_WINDOW_MS
          ),
        },
      }
    );

    return {
      allowed: true,
      remaining: MAX_REFRESH_ATTEMPTS - 1,
      retryAfter: 0,
    };
  }

  // -----------------------------------------
  // 5. Rate limit reached
  // -----------------------------------------

  if (
    record.attempts >=
    MAX_REFRESH_ATTEMPTS
  ) {
    const retryAfter = Math.ceil(
      (
        windowStart +
        REFRESH_WINDOW_MS -
        now
      ) / 1000
    );

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  // -----------------------------------------
  // 6. Increment attempts
  // -----------------------------------------

  await collection.updateOne(
    { _id: record._id },
    {
      $inc: {
        attempts: 1,
      },
    }
  );

  return {
    allowed: true,
    remaining:
      MAX_REFRESH_ATTEMPTS -
      record.attempts -
      1,
    retryAfter: 0,
  };
}