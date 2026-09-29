import {
  Db,
  Collection,
  ObjectId,
} from "mongodb"

import {
  PasswordHistoryDocument,
} from "@/lib/types"

export function getPasswordHistoryCollection(
  db: Db
): Collection<PasswordHistoryDocument> {
  return db.collection<PasswordHistoryDocument>(
    "password_history"
  )
}