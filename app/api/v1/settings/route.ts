import { NextRequest } from "next/server";
import { connectToDatabase, SystemSettingModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const settings = await SystemSettingModel.find();
    const settingsMap: Record<string, any> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    return sendSuccess(settingsMap);
  } catch (error: any) {
    return sendError("SETTINGS_FETCH_FAILED", error.message, null, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const updatedKeys: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      await SystemSettingModel.updateOne(
        { key },
        { $set: { key, value } },
        { upsert: true }
      );
      updatedKeys.push(key);
    }

    await logAuditEvent({
      userName: "Admin",
      action: "SETTINGS_UPDATED",
      entity: "SystemSettings",
      newValue: body,
    });

    return sendSuccess({ message: "Settings updated successfully", updatedKeys });
  } catch (error: any) {
    return sendError("SETTINGS_UPDATE_FAILED", error.message, null, 400);
  }
}
