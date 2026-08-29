import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { text?: unknown };
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return Response.json({ error: "متنی برای ساخت فایل Word وجود ندارد." }, { status: 400 });
    }

    const paragraphs = text.split(/\n+/).map((line) =>
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [
          new TextRun({ text: line, rightToLeft: true, font: "Arial" }),
        ],
      }),
    );

    const document = new Document({
      creator: "کافی‌نت توسن",
      title: "تبدیل PDF به Word",
      description: "متن استخراج‌شده از فایل PDF",
      sections: [{ properties: {}, children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(document);
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 1000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error("ساختار فایل Word معتبر نیست.");
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": "attachment; filename=converted.docx",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("PDF-to-Word DOCX generation failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "ساخت فایل Word انجام نشد." },
      { status: 500 },
    );
  }
}
