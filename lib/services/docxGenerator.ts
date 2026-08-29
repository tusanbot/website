const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function createDocxBlob(text: string): Promise<Blob> {
  if (!text.trim()) throw new Error("متنی برای ساخت فایل Word وجود ندارد.");

  const response = await fetch("/api/tools/pdf-to-word/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let message = "ساخت فایل Word انجام نشد.";
    try {
      const payload = await response.json() as { error?: string };
      if (payload.error) message = payload.error;
    } catch {}
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.size < 1000 || blob.type !== DOCX_MIME) {
    throw new Error("سرور فایل Word معتبر برنگرداند.");
  }
  return blob;
}
