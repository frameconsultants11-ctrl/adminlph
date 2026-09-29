import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  ObjectId,
} from "mongodb"

import { getDb } from "@/lib/db"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

import {
  requireCsrf,
} from "@/lib/require-csrf"

import {
  getTrainerCollection,
} from "@/models/trainer"

import {
  uploadTrainerImage,
  deleteTrainerImage,
} from "@/lib/trainer-image"

import {
  hashTrainerPassword,
} from "@/lib/trainer-password"

import {
  validateAbout,
  validateEducation,
  validateExperience,
} from "@/lib/trainer-validation"

import { logAudit } from "@/lib/audit"

function serializeTrainer(
  trainer: any
) {
  return {
    ...trainer,

    _id:
      trainer._id?.toString(),

    certifications:
      trainer.certifications?.map(
        (id: ObjectId) =>
          id.toString()
      ) || [],

    toolsTeach:
      trainer.toolsTeach?.map(
        (id: ObjectId) =>
          id.toString()
      ) || [],

    skills:
      trainer.skills?.map(
        (id: ObjectId) =>
          id.toString()
      ) || [],

    courses:
      trainer.courses?.map(
        (id: ObjectId) =>
          id.toString()
      ) || [],
  }
}

function parseBoolean(
  value: FormDataEntryValue | null,
  defaultValue: boolean
) {
  if (value === null) {
    return defaultValue
  }

  return value === "true"
}

function parseNumber(
  value: FormDataEntryValue | null
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return 0
  }

  const number =
    Number(value)

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new Error(
      "Invalid hourly rate"
    )
  }

  return number
}

function parseJsonArray(
  value: FormDataEntryValue | null,
  fieldName: string
): any[] {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return []
  }

  try {
    const parsed =
      JSON.parse(value)

    if (!Array.isArray(parsed)) {
      throw new Error()
    }

    return parsed
  } catch {
    throw new Error(
      `Invalid ${fieldName} data`
    )
  }
}

function parseObjectIdArray(
  value: FormDataEntryValue | null,
  fieldName: string
): ObjectId[] {
  const values =
    parseJsonArray(
      value,
      fieldName
    )

  const result: ObjectId[] = []

  for (const item of values) {
    if (
      typeof item !== "string" ||
      !ObjectId.isValid(item)
    ) {
      throw new Error(
        `Invalid ${fieldName} ID`
      )
    }

    result.push(
      new ObjectId(item)
    )
  }

  return result
}

function validatePassword(
  password: string
) {
  if (password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters"
    )
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error(
      "Password must contain at least one uppercase letter"
    )
  }

  if (!/[a-z]/.test(password)) {
    throw new Error(
      "Password must contain at least one lowercase letter"
    )
  }

  if (!/[0-9]/.test(password)) {
    throw new Error(
      "Password must contain at least one number"
    )
  }
}

/* =========================
   GET ALL TRAINERS
========================= */

export async function GET(
  req: NextRequest
) {
  try {
    const user = await authenticate(req)

    authorize(user, "admin")

    const db = await getDb()

    const collection =
      getTrainerCollection(db)

    const { searchParams } =
      new URL(req.url)

    /* =========================
       BASIC FILTERS
    ========================= */

    const search =
      searchParams
        .get("search")
        ?.trim() || ""

    const isActive =
      searchParams.get("isActive")

    const isAvailable =
      searchParams.get("isAvailable")

    /* =========================
       RELATION FILTERS
    ========================= */

    const courseId =
      searchParams.get("course")

    const certificationId =
      searchParams.get("certification")

    const skillId =
      searchParams.get("skill")

    const toolId =
      searchParams.get("tool")

    /* =========================
       EDUCATION / EXPERIENCE
    ========================= */

    const educationLevel =
      searchParams.get(
        "educationLevel"
      )

    const currentEducation =
      searchParams.get(
        "currentEducation"
      )

    const currentExperience =
      searchParams.get(
        "currentExperience"
      )

    /* =========================
       HOURLY RATE
    ========================= */

    const minRate =
      searchParams.get("minRate")

    const maxRate =
      searchParams.get("maxRate")

    /* =========================
       PAGINATION
    ========================= */

    const page = Math.max(
      1,
      Number(
        searchParams.get("page") || 1
      )
    )

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number(
          searchParams.get("limit") || 10
        )
      )
    )

    /* =========================
       SORT
    ========================= */

    const sort =
      searchParams.get("sort") ||
      "newest"

    const query: any = {}

    /* =========================
       SEARCH
    ========================= */

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ]
    }

    /* =========================
       ACTIVE
    ========================= */

    if (
      isActive === "true" ||
      isActive === "false"
    ) {
      query.isActive =
        isActive === "true"
    }

    /* =========================
       AVAILABLE
    ========================= */

    if (
      isAvailable === "true" ||
      isAvailable === "false"
    ) {
      query.isAvailable =
        isAvailable === "true"
    }

    /* =========================
       COURSE
    ========================= */

    if (
      courseId &&
      ObjectId.isValid(courseId)
    ) {
      query.courses =
        new ObjectId(courseId)
    }

    /* =========================
       CERTIFICATION
    ========================= */

    if (
      certificationId &&
      ObjectId.isValid(
        certificationId
      )
    ) {
      query.certifications =
        new ObjectId(
          certificationId
        )
    }

    /* =========================
       SKILL
    ========================= */

    if (
      skillId &&
      ObjectId.isValid(skillId)
    ) {
      query.skills =
        new ObjectId(skillId)
    }

    /* =========================
       TOOL
    ========================= */

    if (
      toolId &&
      ObjectId.isValid(toolId)
    ) {
      query.toolsTeach =
        new ObjectId(toolId)
    }

    /* =========================
       EDUCATION LEVEL
    ========================= */

    if (
      [
        "high_school",
        "college",
        "masters",
        "doctorate",
      ].includes(
        educationLevel || ""
      )
    ) {
      query.education = {
        $elemMatch: {
          level: educationLevel,
        },
      }
    }

    /* =========================
       CURRENT EDUCATION
    ========================= */

    if (
      currentEducation === "true"
    ) {
      query.education = {
        ...(query.education || {}),
        $elemMatch: {
          ...(query.education?.$elemMatch ||
            {}),
          isCurrent: true,
        },
      }
    }

    /* =========================
       CURRENT EXPERIENCE
    ========================= */

    if (
      currentExperience === "true"
    ) {
      query.experience = {
        $elemMatch: {
          isCurrent: true,
        },
      }
    }

    /* =========================
       HOURLY RATE
    ========================= */

    if (minRate) {
      const value =
        Number(minRate)

      if (
        Number.isFinite(value) &&
        value >= 0
      ) {
        query.hourlyRate = {
          ...(query.hourlyRate || {}),
          $gte: value,
        }
      }
    }

    if (maxRate) {
      const value =
        Number(maxRate)

      if (
        Number.isFinite(value) &&
        value >= 0
      ) {
        query.hourlyRate = {
          ...(query.hourlyRate || {}),
          $lte: value,
        }
      }
    }

    /* =========================
       SORT
    ========================= */

    let sortQuery:
      | Record<string, 1 | -1> =
      {
        createdAt: -1,
      }

    switch (sort) {
      case "oldest":
        sortQuery = {
          createdAt: 1,
        }
        break

      case "name_asc":
        sortQuery = {
          name: 1,
        }
        break

      case "name_desc":
        sortQuery = {
          name: -1,
        }
        break

      case "rate_low":
        sortQuery = {
          hourlyRate: 1,
        }
        break

      case "rate_high":
        sortQuery = {
          hourlyRate: -1,
        }
        break

      default:
        sortQuery = {
          createdAt: -1,
        }
    }

    /* =========================
       PAGINATION
    ========================= */

    const skip =
      (page - 1) * limit

    const [
      trainers,
      total,
    ] = await Promise.all([
      collection
        .find(query, {
          projection: {
            password: 0,
          },
        })
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .toArray(),

      collection.countDocuments(
        query
      ),
    ])

    return NextResponse.json({
      success: true,

      data: trainers.map(
        serializeTrainer
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    })
  } catch (error: any) {
    console.error(
      "GET TRAINERS ERROR:",
      error
    )

    const message =
      error?.message ||
      "Failed to fetch trainers"

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status:
          message ===
          "Authentication required"
            ? 401
            : message.includes(
                "permission"
              )
            ? 403
            : 500,
      }
    )
  }
}

/* =========================
   CREATE TRAINER
========================= */

export async function POST(
  req: NextRequest
) {
  let uploadedImage:
    | string
    | null = null

  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const formData =
      await req.formData()

    /* =========================
       BASIC FIELDS
    ========================= */

    const nameValue =
      formData.get("name")

    const emailValue =
      formData.get("email")

    const phoneValue =
      formData.get("phone")

    const passwordValue =
      formData.get(
        "password"
      )

    const aboutValue =
      formData.get("about")

    if (
      typeof nameValue !==
        "string" ||
      !nameValue.trim()
    ) {
      throw new Error(
        "Trainer name is required"
      )
    }

    if (
      typeof emailValue !==
        "string" ||
      !emailValue.trim()
    ) {
      throw new Error(
        "Trainer email is required"
      )
    }

    if (
      typeof phoneValue !==
        "string" ||
      !phoneValue.trim()
    ) {
      throw new Error(
        "Trainer phone is required"
      )
    }

    if (
      typeof passwordValue !==
        "string"
    ) {
      throw new Error(
        "Trainer password is required"
      )
    }

    const name =
      nameValue.trim()

    const email =
      emailValue
        .trim()
        .toLowerCase()

    const phone =
      phoneValue.trim()

    const password =
      passwordValue

    const about =
      typeof aboutValue ===
      "string"
        ? aboutValue.trim()
        : ""

    /* =========================
       PASSWORD
    ========================= */

    validatePassword(
      password
    )

    /* =========================
       ABOUT
    ========================= */

    validateAbout(
      about
    )

    /* =========================
       EDUCATION
    ========================= */

    const education =
      parseJsonArray(
        formData.get(
          "education"
        ),
        "education"
      )

    validateEducation(
      education
    )

    /* =========================
       EXPERIENCE
    ========================= */

    const experience =
      parseJsonArray(
        formData.get(
          "experience"
        ),
        "experience"
      )

    validateExperience(
      experience
    )

    /* =========================
       RELATIONS
    ========================= */

    const certifications =
      parseObjectIdArray(
        formData.get(
          "certifications"
        ),
        "certifications"
      )

    const toolsTeach =
      parseObjectIdArray(
        formData.get(
          "toolsTeach"
        ),
        "toolsTeach"
      )

    const skills =
      parseObjectIdArray(
        formData.get(
          "skills"
        ),
        "skills"
      )

    const courses =
      parseObjectIdArray(
        formData.get(
          "courses"
        ),
        "courses"
      )

    /* =========================
       STATUS
    ========================= */

    const isActive =
      parseBoolean(
        formData.get(
          "isActive"
        ),
        true
      )

    const isAvailable =
      parseBoolean(
        formData.get(
          "isAvailable"
        ),
        true
      )

    /* =========================
       HOURLY RATE
    ========================= */

    const hourlyRate =
      parseNumber(
        formData.get(
          "hourlyRate"
        )
      )

    /* =========================
       IMAGE
    ========================= */

    const imageValue =
      formData.get("image")

    if (
      !imageValue ||
      !(imageValue instanceof File)
    ) {
      throw new Error(
        "Trainer image is required"
      )
    }

    /* =========================
       DATABASE
    ========================= */

    const db =
      await getDb()

    const collection =
      getTrainerCollection(db)

    /* Duplicate email */

    const existing =
      await collection.findOne({
        email,
      })

    if (existing) {
      throw new Error(
        "Trainer with this email already exists"
      )
    }

    /* =========================
       IMAGE UPLOAD
    ========================= */

    uploadedImage =
      await uploadTrainerImage(
        imageValue
      )

    /* =========================
       PASSWORD HASH
    ========================= */

    const hashedPassword =
      await hashTrainerPassword(
        password
      )

    const now =
      new Date()

    const trainer = {
      name,

      email,

      phone,

      password:
        hashedPassword,

      image:
        uploadedImage,

      about,

      isActive,

      isAvailable,

      hourlyRate,

      certifications,

      education,

      experience,

      toolsTeach,

      skills,

      courses,

      createdAt:
        now,

      updatedAt:
        now,
    }

    const result =
      await collection.insertOne(
        trainer
      )

    const created =
      await collection.findOne(
        {
          _id:
            result.insertedId,
        },
        {
          projection: {
            password: 0,
          },
        }
      )

    await logAudit({
      userId: user._id,

      action:
        "TRAINER_CREATED",

      metadata: {
        trainerId:
          result.insertedId.toString(),

        name,

        email,
      },
    })

    return NextResponse.json(
      {
        success: true,

        message:
          "Trainer created successfully",

        data:
          serializeTrainer(
            created
          ),
      },
      {
        status: 201,
      }
    )
  } catch (error: any) {
    console.error(
      "CREATE TRAINER ERROR:",
      error
    )

    /* Cleanup uploaded image */

    if (uploadedImage) {
      await deleteTrainerImage(
        uploadedImage
      )
    }

    const message =
      error?.message ||
      "Failed to create trainer"

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status:
          message.includes(
            "CSRF"
          )
            ? 403
            : message.includes(
                "Authentication"
              )
            ? 401
            : message.includes(
                "permission"
              )
            ? 403
            : message.includes(
                "already exists"
              )
            ? 409
            : 400,
      }
    )
  }
}