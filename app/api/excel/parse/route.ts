import { NextRequest, NextResponse } from "next/server";
import { ExcelService } from "@/lib/services/excel.service";
import { connectToDatabase, SystemSettingModel, AuditLogModel } from "@/lib/db/mongodb";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Supported formats: .xlsx, .xls, .csv",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const settingRow = await SystemSettingModel.findOne({ key: "net_quantity" }).lean();
    const defaultNetQty = settingRow?.value || "1U";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseResult = ExcelService.parseExcelBuffer(
      buffer,
      file.name,
      defaultNetQty
    );

    // Audit log
    await AuditLogModel.create({
      action: "Excel Uploaded",
      entity: "EXCEL_BATCH",
      details: JSON.stringify({
        fileName: file.name,
        totalRows: parseResult.totalRows,
        totalLabels: parseResult.totalLabels,
        errors: parseResult.errorCount,
      }),
    });

    return NextResponse.json({ success: true, result: parseResult });
  } catch (error: any) {
    console.error("Excel parse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to parse uploaded Excel file.",
      },
      { status: 500 }
    );
  }
}
