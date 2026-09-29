import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"

import { getDb } from "@/lib/db"
import {
  getPasswordHistoryCollection,
} from "@/models/password-history"

const PASSWORD_HISTORY_LIMIT = 5

export async function isPasswordReused(
  userId: ObjectId,
  newPassword: string
) {
  const db = await getDb()

  const history =
    getPasswordHistoryCollection(db)

  const previousPasswords =
    await history
      .find({
        userId,
      })
      .sort({
        createdAt: -1,
      })
      .limit(
        PASSWORD_HISTORY_LIMIT
      )
      .toArray()

  for (
    const previous of previousPasswords
  ) {
    const matches =
      await bcrypt.compare(
        newPassword,
        previous.passwordHash
      )

    if (matches) {
      return true
    }
  }

  return false
} 

export async function savePasswordHistory(
  userId: ObjectId,
  passwordHash: string
) {
  const db = await getDb()

  const history =
    getPasswordHistoryCollection(db)

  await history.insertOne({
    userId,
    passwordHash,
    createdAt: new Date(),
  })

  // Keep only the latest 5
  const oldPasswords =
    await history
      .find({
        userId,
      })
      .sort({
        createdAt: -1,
      })
      .skip(
        PASSWORD_HISTORY_LIMIT
      )
      .toArray()

  if (oldPasswords.length > 0) {
    await history.deleteMany({
      _id: {
        $in: oldPasswords
          .map(
            (password) =>
              password._id!
          ),
      },
    })
  }
}