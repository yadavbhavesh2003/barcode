import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, hasPermission, hashPassword } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "manage")) {
      return sendError("FORBIDDEN", "Permission denied to reset user passwords.", null, 403);
    }

    const { id } = await params;
    const user = await UserModel.findById(id);
    if (!user) {
      return sendError("NOT_FOUND", "User not found.", null, 404);
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return sendError("VALIDATION_ERROR", "Password must be at least 6 characters.", null, 400);
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "ADMIN_RESET_USER_PASSWORD",
      entity: "User",
      entityId: user._id.toString(),
      newValue: { targetUserEmail: user.email },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({ message: `Password for ${user.name} has been reset successfully.` });
  } catch (error: any) {
    return sendError("PASSWORD_RESET_FAILED", error.message, null, 500);
  }
}
