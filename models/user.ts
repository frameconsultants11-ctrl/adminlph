import { Db, Collection } from "mongodb"
import { User } from "@/lib/types"

export function getUserCollection(
  db: Db
): Collection<User> {
  return db.collection<User>("adminUser")
}