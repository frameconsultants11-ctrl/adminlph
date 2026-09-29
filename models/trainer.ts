import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"

export type TrainerEducation = {
  level:
    | "high_school"
    | "college"
    | "masters"
    | "doctorate"

  institution: string

  year: string

  isCurrent: boolean
}

export type TrainerExperience = {
  designation: string

  company: string

  from: string

  to: string

  isCurrent: boolean
}

export type Trainer = {
  _id?: ObjectId

  name: string

  email: string

  phone: string

  password: string

  image: string

  about: string

  isActive: boolean

  isAvailable: boolean

  hourlyRate: number

  certifications: ObjectId[]

  education: TrainerEducation[]

  experience: TrainerExperience[]

  toolsTeach: ObjectId[]

  skills: ObjectId[]

  courses: ObjectId[]

  createdAt: Date

  updatedAt: Date
}

export function getTrainerCollection(
  db: Db
): Collection<Trainer> {
  return db.collection<Trainer>(
    "trainers"
  )
}