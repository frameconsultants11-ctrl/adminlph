import { ObjectId } from "mongodb"
import { getDb } from "@/lib/db"
import {
  AuditAction,
  getAuditCollection,
} from "@/models/audit"

type AuditOptions = {
  userId?: ObjectId
  action: AuditAction
  ip?: string
  userAgent?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(
  options: AuditOptions
) {
  try {
    const db = await getDb()

    const audits =
      getAuditCollection(db)

    await audits.insertOne({
      userId: options.userId,
      action: options.action,
      ip: options.ip,
      userAgent: options.userAgent,
      sessionId: options.sessionId,
      metadata: options.metadata,
      createdAt: new Date(),
    })
  } catch (error) {
    // Audit logging should never break authentication
    console.error(
      "AUDIT LOG ERROR:",
      error
    )
  }
}