import { connectToDatabase, AuditLogModel } from "../db/mongodb";

export async function logAuditEvent({
  userId,
  userName = "Admin",
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
  requestId,
}: {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}) {
  try {
    await connectToDatabase();
    await AuditLogModel.create({
      userId,
      userName,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      requestId,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}
