import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "view")) {
      return sendError("FORBIDDEN", "Permission denied.", null, 403);
    }

    const { id } = await params;
    const user = await UserModel.findById(id)
      .select("-passwordHash")
      .populate({ path: "customRoleId", select: "name slug", strictPopulate: false });
    if (!user) {
      return sendError("NOT_FOUND", "User not found.", null, 404);
    }

    return sendSuccess(user);
  } catch (error: any) {
    return sendError("USER_FETCH_FAILED", error.message, null, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "edit")) {
      return sendError("FORBIDDEN", "Permission denied to edit users.", null, 403);
    }

    const { id } = await params;
    const user = await UserModel.findById(id);
    if (!user) {
      return sendError("NOT_FOUND", "User not found.", null, 404);
    }

    const body = await req.json();
    const { name, role, customRoleId, department, branch, phone, permissions, status } = body;

    const oldValue = {
      name: user.name,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
    };

    if (name) user.name = name;
    if (role) user.role = role;
    if (customRoleId !== undefined) user.customRoleId = customRoleId || null;
    if (department !== undefined) user.department = department;
    if (branch !== undefined) user.branch = branch;
    if (phone !== undefined) user.phone = phone;
    if (permissions !== undefined) user.permissions = permissions;
    if (status) user.status = status;

    await user.save();

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "USER_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      oldValue,
      newValue: { name: user.name, role: user.role, status: user.status, permissions: user.permissions },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    const { passwordHash: _hash, ...userObj } = user.toObject();
    return sendSuccess(userObj);
  } catch (error: any) {
    return sendError("USER_UPDATE_FAILED", error.message, null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "delete")) {
      return sendError("FORBIDDEN", "Permission denied to delete users.", null, 403);
    }

    const { id } = await params;
    if (currentUser.id === id) {
      return sendError("BAD_REQUEST", "You cannot delete or deactivate your own account.", null, 400);
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return sendError("NOT_FOUND", "User not found.", null, 404);
    }

    user.status = "inactive";
    await user.save();

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "USER_DEACTIVATED",
      entity: "User",
      entityId: user._id.toString(),
      newValue: { status: "inactive" },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({ message: `User ${user.name} has been deactivated.` });
  } catch (error: any) {
    return sendError("USER_DELETE_FAILED", error.message, null, 500);
  }
}
