import { ObjectId } from "mongodb"

export type UserRole =
  | "manager"
  | "admin"
  | "staff"

export type User = {
  _id?: ObjectId
  name: string
  email: string
  password: string
  role: UserRole
  createdAt: Date
  isActive: boolean
   failedLoginAttempts?: number
  lockedUntil?: Date | null
  lastFailedLoginAt?: Date | null
}

export type AccessTokenPayload = {
  sub: string
  jti: string
  role: UserRole
  type: "access"
  iat: number
  exp: number
}

export type RefreshTokenDocument = {
  _id?: ObjectId
  userId: ObjectId
  tokenHash: string
    sessionId: string
  deviceId: string
  deviceName?: string
  expiresAt: Date
  revokedAt?: Date | null
  createdAt: Date
  lastUsedAt?: Date
}

export type BlacklistedToken = {
  _id?: ObjectId
  jti: string
  userId: ObjectId
  expiresAt: Date
  createdAt: Date
} 

export type PasswordHistoryDocument = {
  _id?: ObjectId
  userId: ObjectId
  passwordHash: string
  createdAt: Date
}