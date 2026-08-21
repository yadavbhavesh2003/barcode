import { NextRequest } from "next/server";
import { connectToDatabase, PrintPresetModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    await connectToDatabase();
    const presets = await PrintPresetModel.find().sort({ isDefault: -1, createdAt: -1 });
    return sendSuccess(presets);
  } catch (error: any) {
    return sendError("PRESETS_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    if (!body.name) {
      return sendError("MISSING_NAME", "Preset name is required", null, 400);
    }

    if (body.isDefault) {
      await PrintPresetModel.updateMany({}, { isDefault: false });
    }

    const preset = await PrintPresetModel.findOneAndUpdate(
      { name: body.name.trim() },
      { $set: body },
      { returnDocument: "after", upsert: true }
    );

    return sendSuccess(preset, 201);
  } catch (error: any) {
    return sendError("PRESET_SAVE_FAILED", error.message, null, 400);
  }
}
