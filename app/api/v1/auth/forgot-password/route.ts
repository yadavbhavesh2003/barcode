import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return sendError("VALIDATION_ERROR", "Email is required.", null, 400);
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal account existence for security; return generic success
      return sendSuccess({
        message: "If an account exists for this email, password reset instructions have been generated.",
      });
    }

    // In a real enterprise SMTP environment, email token is dispatched.
    // For our immediate enterprise panel, we generate a mock verification OTP/token and log audit.
    const resetToken = crypto.randomBytes(20).toString("hex");

    await AuditLogModel.create({
      userId: user._id.toString(),
      userName: user.name,
      action: "PASSWORD_RESET_REQUEST",
      entity: "Auth",
      entityId: user._id.toString(),
      newValue: { email: user.email },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({
      message: "Password reset request initiated successfully.",
      resetToken, // Provided for user demonstration flow
      userEmail: user.email,
    });
  } catch (error: any) {
    return sendError("FORGOT_PASSWORD_FAILED", error.message, null, 500);
  }
}
