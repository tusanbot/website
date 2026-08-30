export const MAX_ORDER_BODY_BYTES = 64 * 1024;
export const MAX_FORM_DATA_KEYS = 100;
export const MAX_FORM_DATA_DEPTH = 6;
export const MAX_FORM_DATA_STRING_LENGTH = 8 * 1024;
export const MAX_FORM_DATA_ARRAY_ITEMS = 100;

export async function readJsonWithLimit<T = unknown>(request: Request, maxBytes: number): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new Error("REQUEST_BODY_TOO_LARGE");
  }

  return JSON.parse(new TextDecoder().decode(buffer)) as T;
}

export function validateFormDataShape(value: unknown): boolean {
  let keys = 0;

  function walk(input: unknown, depth: number): boolean {
    if (depth > MAX_FORM_DATA_DEPTH) return false;
    if (typeof input === "string") return input.length <= MAX_FORM_DATA_STRING_LENGTH;
    if (input === null || typeof input !== "object") return true;

    if (Array.isArray(input)) {
      if (input.length > MAX_FORM_DATA_ARRAY_ITEMS) return false;
      return input.every((item) => walk(item, depth + 1));
    }

    const entries = Object.entries(input);
    keys += entries.length;
    if (keys > MAX_FORM_DATA_KEYS) return false;
    return entries.every(([key, item]) => key.length <= 256 && walk(item, depth + 1));
  }

  return walk(value, 0);
}
