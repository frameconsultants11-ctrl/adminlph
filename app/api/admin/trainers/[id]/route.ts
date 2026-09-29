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
  value: FormDataEntryValue | null
) {
  if (value === null) {
    return undefined
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
    return undefined
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

  return values.map(
    (id) => {
      if (
        typeof id !== "string" ||
        !ObjectId.isValid(id)
      ) {
        throw new Error(
          `Invalid ${fieldName} ID`
        )
      }

      return new ObjectId(id)
    }
  )
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
   GET ONE
========================= */

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    const {
      id,
    } = await params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid trainer ID",
        },
        {
          status: 400,
        }
      )
    }

    const db =
      await getDb()

    const collection =
      getTrainerCollection(db)

    const trainer =
      await collection.findOne(
        {
          _id:
            new ObjectId(id),
        },
        {
          projection: {
            password: 0,
          },
        }
      )

    if (!trainer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trainer not found",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      success: true,

      data:
        serializeTrainer(
          trainer
        ),
    })
  } catch (error: any) {
    console.error(
      "GET TRAINER ERROR:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch trainer",
      },
      {
        status: 500,
      }
    )
  }
}

/* =========================
   PATCH
========================= */

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  let newImage:
    | string
    | null = null

  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const {
      id,
    } = await params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid trainer ID",
        },
        {
          status: 400,
        }
      )
    }

    const trainerId =
      new ObjectId(id)

    const db =
      await getDb()

    const collection =
      getTrainerCollection(db)

    const existing =
      await collection.findOne(
        {
          _id:
            trainerId,
        }
      )

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trainer not found",
        },
        {
          status: 404,
        }
      )
    }

    const formData =
      await req.formData()

    const update: any = {
      updatedAt:
        new Date(),
    }

    /* =========================
       NAME
    ========================= */

    const nameValue =
      formData.get("name")

    if (
      typeof nameValue ===
      "string"
    ) {
      const name =
        nameValue.trim()

      if (!name) {
        throw new Error(
          "Trainer name cannot be empty"
        )
      }

      update.name = name
    }

    /* =========================
       EMAIL
    ========================= */

    const emailValue =
      formData.get("email")

    if (
      typeof emailValue ===
      "string"
    ) {
      const email =
        emailValue
          .trim()
          .toLowerCase()

      if (!email) {
        throw new Error(
          "Trainer email cannot be empty"
        )
      }

      const duplicate =
        await collection.findOne({
          _id: {
            $ne:
              trainerId,
          },

          email,
        })

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Trainer with this email already exists",
          },
          {
            status: 409,
          }
        )
      }

      update.email = email
    }

    /* =========================
       PHONE
    ========================= */

    const phoneValue =
      formData.get("phone")

    if (
      typeof phoneValue ===
      "string"
    ) {
      const phone =
        phoneValue.trim()

      if (!phone) {
        throw new Error(
          "Trainer phone cannot be empty"
        )
      }

      update.phone =
        phone
    }

    /* =========================
       ABOUT
    ========================= */

    const aboutValue =
      formData.get("about")

    if (
      typeof aboutValue ===
      "string"
    ) {
      const about =
        aboutValue.trim()

      validateAbout(
        about
      )

      update.about =
        about
    }

    /* =========================
       ACTIVE
    ========================= */

    const isActive =
      parseBoolean(
        formData.get(
          "isActive"
        )
      )

    if (
      isActive !== undefined
    ) {
      update.isActive =
        isActive
    }

    /* =========================
       AVAILABLE
    ========================= */

    const isAvailable =
      parseBoolean(
        formData.get(
          "isAvailable"
        )
      )

    if (
      isAvailable !== undefined
    ) {
      update.isAvailable =
        isAvailable
    }

    /* =========================
       HOURLY RATE
    ========================= */

    const hourlyRate =
      parseNumber(
        formData.get(
          "hourlyRate"
        )
      )

    if (
      hourlyRate !== undefined
    ) {
      update.hourlyRate =
        hourlyRate
    }

    /* =========================
       EDUCATION
    ========================= */

    const educationValue =
      formData.get(
        "education"
      )

    if (
      typeof educationValue ===
      "string"
    ) {
      const education =
        parseJsonArray(
          educationValue,
          "education"
        )

      validateEducation(
        education
      )

      update.education =
        education
    }

    /* =========================
       EXPERIENCE
    ========================= */

    const experienceValue =
      formData.get(
        "experience"
      )

    if (
      typeof experienceValue ===
      "string"
    ) {
      const experience =
        parseJsonArray(
          experienceValue,
          "experience"
        )

      validateExperience(
        experience
      )

      update.experience =
        experience
    }

    /* =========================
       CERTIFICATIONS
    ========================= */

    const certificationsValue =
      formData.get(
        "certifications"
      )

    if (
      typeof certificationsValue ===
      "string"
    ) {
      update.certifications =
        parseObjectIdArray(
          certificationsValue,
          "certifications"
        )
    }

    /* =========================
       TOOLS
    ========================= */

    const toolsValue =
      formData.get(
        "toolsTeach"
      )

    if (
      typeof toolsValue ===
      "string"
    ) {
      update.toolsTeach =
        parseObjectIdArray(
          toolsValue,
          "toolsTeach"
        )
    }

    /* =========================
       SKILLS
    ========================= */

    const skillsValue =
      formData.get(
        "skills"
      )

    if (
      typeof skillsValue ===
      "string"
    ) {
      update.skills =
        parseObjectIdArray(
          skillsValue,
          "skills"
        )
    }

    /* =========================
       COURSES
    ========================= */

    const coursesValue =
      formData.get(
        "courses"
      )

    if (
      typeof coursesValue ===
      "string"
    ) {
      update.courses =
        parseObjectIdArray(
          coursesValue,
          "courses"
        )
    }

    /* =========================
       PASSWORD
    ========================= */

    const passwordValue =
      formData.get(
        "password"
      )

    if (
      typeof passwordValue ===
      "string" &&
      passwordValue.length > 0
    ) {
      validatePassword(
        passwordValue
      )

      update.password =
        await hashTrainerPassword(
          passwordValue
        )
    }

    /* =========================
       IMAGE
    ========================= */

    const imageValue =
      formData.get("image")

    if (
      imageValue &&
      imageValue instanceof File &&
      imageValue.size > 0
    ) {
      newImage =
        await uploadTrainerImage(
          imageValue
        )

      update.image =
        newImage
    }

    /* =========================
       UPDATE
    ========================= */

    const result =
      await collection.updateOne(
        {
          _id:
            trainerId,
        },
        {
          $set:
            update,
        }
      )

    if (
      result.modifiedCount !== 1
    ) {
      if (newImage) {
        await deleteTrainerImage(
          newImage
        )
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "No changes were made",
        },
        {
          status: 400,
        }
      )
    }

    /* Delete old image AFTER
       database update */

    if (
      newImage &&
      existing.image
    ) {
      await deleteTrainerImage(
        existing.image
      )
    }

    const updated =
      await collection.findOne(
        {
          _id:
            trainerId,
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
        "TRAINER_UPDATED",

      metadata: {
        trainerId: id,

        name:
          updated?.name,
      },
    })

    return NextResponse.json({
      success: true,

      message:
        "Trainer updated successfully",

      data:
        serializeTrainer(
          updated
        ),
    })
  } catch (error: any) {
    console.error(
      "UPDATE TRAINER ERROR:",
      error
    )

    if (newImage) {
      await deleteTrainerImage(
        newImage
      )
    }

    const message =
      error?.message ||
      "Failed to update trainer"

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

/* =========================
   DELETE
========================= */

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    const user =
      await authenticate(req)

    authorize(user, "admin")

    requireCsrf(req)

    const {
      id,
    } = await params

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid trainer ID",
        },
        {
          status: 400,
        }
      )
    }

    const trainerId =
      new ObjectId(id)

    const db =
      await getDb()

    const collection =
      getTrainerCollection(db)

    const existing =
      await collection.findOne({
        _id:
          trainerId,
      })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Trainer not found",
        },
        {
          status: 404,
        }
      )
    }

    await collection.deleteOne({
      _id:
        trainerId,
    })

    await deleteTrainerImage(
      existing.image
    )

    await logAudit({
      userId: user._id,

      action:
        "TRAINER_DELETED",

      metadata: {
        trainerId: id,

        name:
          existing.name,

        email:
          existing.email,
      },
    })

    return NextResponse.json({
      success: true,

      message:
        "Trainer deleted successfully",
    })
  } catch (error: any) {
    console.error(
      "DELETE TRAINER ERROR:",
      error
    )

    const message =
      error?.message ||
      "Failed to delete trainer"

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
            : 500,
      }
    )
  }
}