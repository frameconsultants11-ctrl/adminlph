// models/skill.ts

import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"


export type Skill = {
  _id?: ObjectId

  name: string

  image: string

  isActive: boolean

  createdAt: Date

  updatedAt: Date
}


export function getSkillCollection(
  db: Db
): Collection<Skill> {
  return db.collection<Skill>(
    "skills"
  )
}