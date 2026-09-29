import {
  NextRequest,
  NextResponse,
} from "next/server"

import {
  authenticate,
} from "@/lib/auth"

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await authenticate(req)

    return NextResponse.json({
      success: true,

      user: {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive:
          user.isActive,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Authentication required",
      },
      { status: 401 }
    )
  }
}