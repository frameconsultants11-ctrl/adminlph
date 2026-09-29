import {
  Db,
  Collection,
  ObjectId,
} from "mongodb"

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TOKEN_REFRESH"
  | "SESSION_TERMINATED"

  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"

  | "PASSWORD_CHANGED"
  | "PASSWORD_CHANGE_FAILED"
  | "PASSWORD_RESET"

  | "ACCOUNT_DISABLED"

  | "TOOL_CREATED"
  | "TOOL_UPDATED"
  | "TOOL_DELETED" 

  | "SKILL_CREATED"
  | "SKILL_UPDATED"
  | "SKILL_DELETED" 

  | "TRAINER_CREATED"
  | "TRAINER_UPDATED"
  | "TRAINER_DELETED" 

    | "CERTIFICATION_CREATED"
  | "CERTIFICATION_UPDATED"
  | "CERTIFICATION_DELETED"
  

export type AuditLog = {
  _id?: ObjectId
  userId?: ObjectId
  action: AuditAction
  ip?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export function getAuditCollection(
  db: Db
): Collection<AuditLog> {
  return db.collection<AuditLog>(
    "audit_logs"
  )
}