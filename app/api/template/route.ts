import { NextResponse } from "next/server";
import { ExcelService } from "@/lib/services/excel.service";

export async function GET() {
  try {
    const buffer = ExcelService.generateTemplateBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="barcode_import_template.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to generate template:", error);
    return NextResponse.json(
      { success: false, error: "Could not generate Excel template." },
      { status: 500 }
    );
  }
}
