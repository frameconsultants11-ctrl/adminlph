import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { getDb } from "@/lib/db"
import { getUserCollection } from "@/models/user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      name,
      email,
      password,
    }: {
      name: string
      email: string
      password: string
    } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email and password are required",
        },
        { status: 400 }
      )
    }

    const db = await getDb()

    const users = getUserCollection(db)

    const existingUser = await users.findOne({
      email: email.toLowerCase(),
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists",
        },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    )

    const user = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin" as const,
      createdAt: new Date(),
      isActive:true
    }

    const result = await users.insertOne(user)

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: result.insertedId.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("SIGNUP ERROR:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 }
    )
  }
}