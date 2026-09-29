import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"

export type Certification = {
  _id?: ObjectId
  name: string
  image: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export function getCertificationCollection(
  db: Db
): Collection<Certification> {
  return db.collection<Certification>("certifications")
}