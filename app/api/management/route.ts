import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  authenticate,
  authorize,
} from "@/lib/auth"

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await authenticate(req)

    authorize(
      user,
      "admin",
      "manager"
    )

    return NextResponse.json({
      success: true,
      message:
        "Management access granted",
      user: {
        id: user._id?.toString(),
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unauthorized"

    const status =
      message.includes(
        "permission"
      )
        ? 403
        : 401

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    )
  }
}