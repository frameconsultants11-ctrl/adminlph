import {
  CourseLevel,
  DiscountType,
  EditorJsContent,
} from "@/models/course"


export const COURSE_LEVELS: CourseLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
]


export const DISCOUNT_TYPES: DiscountType[] = [
  "percentage",
  "amount",
]


// ==========================================
// EDITOR JS
// ==========================================

export function validateEditorJs(
  details: EditorJsContent
) {
  if (
    !details ||
    typeof details !== "object"
  ) {
    throw new Error(
      "Course details are required"
    )
  }

  if (
    !Array.isArray(
      details.blocks
    )
  ) {
    throw new Error(
      "Course details blocks are required"
    )
  }
}


// ==========================================
// PRICE
// ==========================================

export function calculateActualPrice(
  price: number,
  discountType: DiscountType,
  discountValue: number
) {

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new Error(
      "Invalid course price"
    )
  }

  if (
    !Number.isFinite(
      discountValue
    ) ||
    discountValue < 0
  ) {
    throw new Error(
      "Invalid discount value"
    )
  }


  let actualPrice = price


  if (
    discountType ===
    "percentage"
  ) {

    if (
      discountValue > 100
    ) {
      throw new Error(
        "Percentage discount cannot exceed 100%"
      )
    }

    actualPrice =
      price -
      (
        price *
        discountValue
      ) /
        100

  } else {

    if (
      discountValue > price
    ) {
      throw new Error(
        "Amount discount cannot exceed course price"
      )
    }

    actualPrice =
      price -
      discountValue
  }


  return Math.max(
    0,
    Number(
      actualPrice.toFixed(2)
    )
  )
}


// ==========================================
// HOURS
// ==========================================

export function validateHours(
  hours: number
) {

  if (
    !Number.isFinite(hours) ||
    hours <= 0
  ) {
    throw new Error(
      "Course hours must be greater than 0"
    )
  }
}