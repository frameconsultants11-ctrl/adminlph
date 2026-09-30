import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"

export type Category = {
  _id?: ObjectId

  name: string

  image: string

  isActive: boolean

  createdAt: Date

  updatedAt: Date
}

export function getCategoryCollection(
  db: Db
): Collection<Category> {
  return db.collection<Category>(
    "categories"
  )
}