import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function createDocxBlob(text: string): Promise<Blob> {
  const paragraphs = text.split(/\n+/).map((line) =>
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [
        new TextRun({
          text: line,
          rightToLeft: true,
          font: "Arial",
        }),
      ],
    }),
  );

  const document = new Document({
    creator: "کافی‌نت توسن",
    title: "تبدیل PDF به Word",
    description: "متن استخراج‌شده از فایل PDF",
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  if (!(blob instanceof Blob) || blob.size < 1000) {
    throw new Error("ساختار فایل Word معتبر نیست.");
  }

  return new Blob([await blob.arrayBuffer()], { type: DOCX_MIME });
}
