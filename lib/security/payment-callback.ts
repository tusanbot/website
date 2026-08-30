export const MAX_CALLBACK_BODY_BYTES = 8 * 1024;

export async function readCallbackBody(request: Request): Promise<URLSearchParams> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > MAX_CALLBACK_BODY_BYTES) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CALLBACK_BODY_BYTES) throw new Error("REQUEST_BODY_TOO_LARGE");
  return new URLSearchParams(new TextDecoder().decode(body));
}
