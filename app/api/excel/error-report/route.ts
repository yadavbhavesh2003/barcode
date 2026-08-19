import { NextRequest, NextResponse } from "next/server";
import { ExcelService, ParsedProductRow } from "@/lib/services/excel.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows = body.rows as ParsedProductRow[];

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: "Invalid rows data." },
        { status: 400 }
      );
    }

    const buffer = ExcelService.generateErrorReportBuffer(rows);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="validation_error_report.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to generate error report:", error);
    return NextResponse.json(
      { success: false, error: "Could not generate error report." },
      { status: 500 }
    );
  }
}
