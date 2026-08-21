import { NextRequest } from "next/server";
import { connectToDatabase, UserModel, AuditLogModel, RoleModel } from "@/lib/db/mongodb";
import { getAuthUser, hasPermission, hashPassword } from "@/lib/auth";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "view")) {
      return sendError("FORBIDDEN", "You do not have permission to view users.", null, 403);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "15", 10));
    const query = searchParams.get("query") || "";
    const role = searchParams.get("role") || "All";
    const status = searchParams.get("status") || "All";

    const filter: any = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { department: { $regex: query, $options: "i" } },
      ];
    }

    if (role !== "All") {
      filter.role = role;
    }

    if (status !== "All") {
      filter.status = status;
    }

    const total = await UserModel.countDocuments(filter);
    const users = await UserModel.find(filter)
      .select("-passwordHash")
      .populate({ path: "customRoleId", select: "name slug", strictPopulate: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return sendSuccess(users, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("USERS_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const currentUser = await getAuthUser();
    if (!currentUser || !hasPermission(currentUser, "users", "create")) {
      return sendError("FORBIDDEN", "You do not have permission to create users.", null, 403);
    }

    const body = await req.json();
    const { name, email, password, role, customRoleId, department, branch, phone, permissions, status } = body;

    if (!name || !email || !password || !role) {
      return sendError("VALIDATION_ERROR", "Name, email, password, and role are required.", null, 400);
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return sendError("CONFLICT", "A user with this email already exists.", null, 409);
    }

    const passwordHash = hashPassword(password);
    const newUser = await UserModel.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      customRoleId: customRoleId || undefined,
      department: department || "Retail",
      branch: branch || "Main Branch",
      phone: phone || "",
      permissions: permissions || [],
      status: status || "active",
    });

    await AuditLogModel.create({
      userId: currentUser.id,
      userName: currentUser.name,
      action: "USER_CREATED",
      entity: "User",
      entityId: newUser._id.toString(),
      newValue: { name, email, role, status: newUser.status },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "",
    });

    const { passwordHash: _hash, ...userObj } = newUser.toObject();
    return sendSuccess(userObj, 201);
  } catch (error: any) {
    return sendError("USER_CREATION_FAILED", error.message, null, 500);
  }
}
