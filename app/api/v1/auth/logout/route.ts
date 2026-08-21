import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, AuditLogModel } from "@/lib/db/mongodb";
import { getAuthUser, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getAuthUser();

    if (user) {
      await AuditLogModel.create({
        userId: user.id,
        userName: user.name,
        action: "USER_LOGOUT",
        entity: "Auth",
        entityId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: req.headers.get("user-agent") || "",
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    // Clear session cookie
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message } },
      { status: 500 }
    );
  }
}
