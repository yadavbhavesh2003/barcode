import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, SystemSettingModel, AuditLogModel } from "@/lib/db/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    const rows = await SystemSettingModel.find().lean();

    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    await connectToDatabase();

    for (const [key, value] of Object.entries(body)) {
      await SystemSettingModel.updateOne(
        { key },
        { $set: { key, value: String(value) } },
        { upsert: true }
      );
    }

    // Audit log
    await AuditLogModel.create({
      action: "Settings Changed",
      details: JSON.stringify(body),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings." },
      { status: 500 }
    );
  }
}
