import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, hashPassword, verifyPassword } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const sessionUser = await getAuthUser();
    if (!sessionUser) {
      return sendError("UNAUTHORIZED", "Please sign in to update your profile.", null, 401);
    }

    const body = await req.json();
    const { name, phone, department, branch, currentPassword, newPassword } = body;

    const user = await UserModel.findById(sessionUser.id);
    if (!user) {
      return sendError("NOT_FOUND", "User not found.", null, 404);
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (branch !== undefined) user.branch = branch;

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return sendError("VALIDATION_ERROR", "Current password is required to set a new password.", null, 400);
      }
      const isMatch = verifyPassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return sendError("INVALID_CREDENTIALS", "Current password does not match.", null, 400);
      }
      if (newPassword.length < 6) {
        return sendError("VALIDATION_ERROR", "New password must be at least 6 characters.", null, 400);
      }
      user.passwordHash = hashPassword(newPassword);
    }

    await user.save();

    await AuditLogModel.create({
      userId: user._id.toString(),
      userName: user.name,
      action: newPassword ? "USER_PROFILE_AND_PASSWORD_UPDATED" : "USER_PROFILE_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({
      message: "Profile updated successfully.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        branch: user.branch,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error: any) {
    return sendError("PROFILE_UPDATE_FAILED", error.message, null, 500);
  }
}
