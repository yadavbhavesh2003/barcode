import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { hashPassword } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, token, newPassword } = body;

    if (!email || !newPassword) {
      return sendError("VALIDATION_ERROR", "Email and new password are required.", null, 400);
    }

    if (newPassword.length < 6) {
      return sendError("VALIDATION_ERROR", "Password must be at least 6 characters long.", null, 400);
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError("NOT_FOUND", "User account not found.", null, 404);
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    await AuditLogModel.create({
      userId: user._id.toString(),
      userName: user.name,
      action: "PASSWORD_RESET_COMPLETED",
      entity: "Auth",
      entityId: user._id.toString(),
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error: any) {
    return sendError("RESET_PASSWORD_FAILED", error.message, null, 500);
  }
}
