import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"

export type Tool = {
  _id?: ObjectId

  name: string

  image: string

  isActive: boolean

  createdAt: Date

  updatedAt: Date
}

export function getToolCollection(
  db: Db
): Collection<Tool> {
  return db.collection<Tool>(
    "tools"
  )
}