import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, RoleModel } from "@/lib/db/mongodb";
import { getAuthUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const sessionUser = await getAuthUser();

    if (!sessionUser) {
      return sendError("UNAUTHENTICATED", "No active session found.", null, 401);
    }

    // Fetch fresh user from DB
    const user = await UserModel.findById(sessionUser.id).select("-passwordHash");
    if (!user || user.status !== "active") {
      return sendError("UNAUTHORIZED", "User is no longer active.", null, 403);
    }

    let effectivePermissions = user.permissions || [];
    if (!effectivePermissions.length) {
      if (user.customRoleId) {
        const customRole = await RoleModel.findById(user.customRoleId);
        if (customRole && customRole.permissions) {
          effectivePermissions = customRole.permissions;
        }
      } else {
        const roleDoc = await RoleModel.findOne({ slug: user.role });
        if (roleDoc && roleDoc.permissions?.length) {
          effectivePermissions = roleDoc.permissions;
        } else {
          effectivePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
        }
      }
    }

    return sendSuccess({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: effectivePermissions,
        department: user.department,
        branch: user.branch,
        avatar: user.avatar,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    return sendError("ME_FAILED", error.message, null, 500);
  }
}
