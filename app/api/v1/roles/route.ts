import { NextRequest } from "next/server";
import { connectToDatabase, RoleModel, UserModel, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "roles", "view")) {
      return sendError("FORBIDDEN", "Permission denied to view roles.", null, 403);
    }

    const roles = await RoleModel.find().sort({ isSystem: -1, createdAt: 1 }).lean();

    // Attach user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role: any) => {
        const count = await UserModel.countDocuments({
          $or: [{ role: role.slug }, { customRoleId: role._id }],
          status: "active",
        });
        return {
          ...role,
          userCount: count,
        };
      })
    );

    return sendSuccess(rolesWithCounts);
  } catch (error: any) {
    return sendError("ROLES_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "roles", "create")) {
      return sendError("FORBIDDEN", "Permission denied to create roles.", null, 403);
    }

    const body = await req.json();
    const { name, description, permissions, status } = body;

    if (!name) {
      return sendError("VALIDATION_ERROR", "Role name is required.", null, 400);
    }

    const slug = name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_");

    const existing = await RoleModel.findOne({
      $or: [{ name: name.trim() }, { slug }],
    });

    if (existing) {
      return sendError("CONFLICT", "A role with this name or code already exists.", null, 409);
    }

    const newRole = await RoleModel.create({
      name: name.trim(),
      slug,
      description: description || "",
      permissions: permissions || [],
      isSystem: false,
      status: status || "active",
    });

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "ROLE_CREATED",
      entity: "Role",
      entityId: newRole._id.toString(),
      newValue: { name: newRole.name, slug: newRole.slug, permissionsCount: newRole.permissions?.length },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    return sendSuccess(newRole, 201);
  } catch (error: any) {
    return sendError("ROLE_CREATION_FAILED", error.message, null, 500);
  }
}
