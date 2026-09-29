const EDUCATION_LEVELS = [
  "high_school",
  "college",
  "masters",
  "doctorate",
] as const

export function countWords(
  text: string
) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

export function validateAbout(
  about: string
) {
  const wordCount =
    countWords(about)

  if (wordCount > 100) {
    throw new Error(
      "About trainer must not exceed 100 words"
    )
  }

  return true
}

export function validateEducation(
  education: any[]
) {
  if (!Array.isArray(education)) {
    throw new Error(
      "Education must be an array"
    )
  }

  for (const item of education) {
    if (
      !EDUCATION_LEVELS.includes(
        item.level
      )
    ) {
      throw new Error(
        "Invalid education level"
      )
    }

    if (
      typeof item.institution !==
        "string" ||
      !item.institution.trim()
    ) {
      throw new Error(
        "Education institution is required"
      )
    }

    if (
      typeof item.year !==
        "string" ||
      !item.year.trim()
    ) {
      throw new Error(
        "Education year is required"
      )
    }

    if (
      typeof item.isCurrent !==
      "boolean"
    ) {
      throw new Error(
        "Education current status is invalid"
      )
    }
  }

  return true
}

export function validateExperience(
  experience: any[]
) {
  if (!Array.isArray(experience)) {
    throw new Error(
      "Experience must be an array"
    )
  }

  for (const item of experience) {
    if (
      typeof item.designation !==
        "string" ||
      !item.designation.trim()
    ) {
      throw new Error(
        "Experience designation is required"
      )
    }

    if (
      typeof item.company !==
        "string" ||
      !item.company.trim()
    ) {
      throw new Error(
        "Experience company is required"
      )
    }

    if (
      typeof item.from !==
        "string" ||
      !item.from.trim()
    ) {
      throw new Error(
        "Experience start year is required"
      )
    }

    if (
      typeof item.isCurrent !==
      "boolean"
    ) {
      throw new Error(
        "Experience current status is invalid"
      )
    }

    if (
      !item.isCurrent &&
      (
        typeof item.to !==
          "string" ||
        !item.to.trim()
      )
    ) {
      throw new Error(
        "Experience end year is required"
      )
    }
  }

  return true
}