import { NextRequest } from "next/server";
import { connectToDatabase, RoleModel, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "roles", "view")) {
      return sendError("FORBIDDEN", "Permission denied.", null, 403);
    }

    const { id } = await params;
    const role = await RoleModel.findById(id);
    if (!role) {
      return sendError("NOT_FOUND", "Role not found.", null, 404);
    }

    const userCount = await UserModel.countDocuments({
      $or: [{ role: role.slug }, { customRoleId: role._id }],
      status: "active",
    });

    return sendSuccess({ ...role.toObject(), userCount });
  } catch (error: any) {
    return sendError("ROLE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "roles", "edit")) {
      return sendError("FORBIDDEN", "Permission denied to edit roles.", null, 403);
    }

    const { id } = await params;
    const role = await RoleModel.findById(id);
    if (!role) {
      return sendError("NOT_FOUND", "Role not found.", null, 404);
    }

    const body = await req.json();
    const { name, description, permissions, status } = body;

    const oldValue = {
      name: role.name,
      permissions: role.permissions,
      status: role.status,
    };

    if (name && !role.isSystem) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined && role.slug !== "SUPER_ADMIN") {
      role.permissions = permissions;
    }
    if (status && !role.isSystem) role.status = status;

    await role.save();

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "ROLE_UPDATED",
      entity: "Role",
      entityId: role._id.toString(),
      oldValue,
      newValue: { name: role.name, permissionsCount: role.permissions?.length, status: role.status },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess(role);
  } catch (error: any) {
    return sendError("ROLE_UPDATE_FAILED", error.message, null, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "roles", "delete")) {
      return sendError("FORBIDDEN", "Permission denied to delete roles.", null, 403);
    }

    const { id } = await params;
    const role = await RoleModel.findById(id);
    if (!role) {
      return sendError("NOT_FOUND", "Role not found.", null, 404);
    }

    if (role.isSystem) {
      return sendError("BAD_REQUEST", "System predefined roles cannot be deleted.", null, 400);
    }

    const usersCount = await UserModel.countDocuments({
      $or: [{ role: role.slug }, { customRoleId: role._id }],
    });

    if (usersCount > 0) {
      return sendError(
        "BAD_REQUEST",
        `Cannot delete role. There are ${usersCount} user(s) currently assigned to this role.`,
        null,
        400
      );
    }

    await RoleModel.findByIdAndDelete(id);

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "ROLE_DELETED",
      entity: "Role",
      entityId: id,
      oldValue: { name: role.name, slug: role.slug },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess({ message: `Role ${role.name} deleted successfully.` });
  } catch (error: any) {
    return sendError("ROLE_DELETE_FAILED", error.message, null, 500);
  }
}
