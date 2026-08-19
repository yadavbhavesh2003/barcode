import { NextResponse } from "next/server";
import { PDFService } from "@/lib/services/pdf.service";

export async function GET() {
  try {
    const pdfBuffer = PDFService.generateTestLabelPDF();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="printer_test_label_50x25.pdf"',
      },
    });
  } catch (error) {
    console.error("Failed to generate test label:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate test label." },
      { status: 500 }
    );
  }
}
