import {
  Collection,
  Db,
  ObjectId,
} from "mongodb"

export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"

export type DiscountType =
  | "percentage"
  | "amount"

export type EditorJsBlock = {
  id?: string
  type: string
  data: Record<string, unknown>
}

export type EditorJsContent = {
  time?: number
  version?: string
  blocks: EditorJsBlock[]
}

export type Course = {
  _id?: ObjectId

  name: string
  category: ObjectId
  image: string

  skills: ObjectId[]
  tools: ObjectId[]

  details: EditorJsContent

  hours: number

  price: number

  discount: {
    type: DiscountType
    value: number
  }

  actualPrice: number

  level: CourseLevel

  // SEO
  seoTitle: string
  seoDescription: string

  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
export function getCourseCollection(
  db: Db
): Collection<Course> {
  return db.collection<Course>(
    "courses"
  )
}