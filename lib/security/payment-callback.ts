import { createHash } from "crypto";

export function getCallbackKey(request: Request, authority: string | null, trackId: string | null): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${forwarded}|${authority ?? ""}|${trackId ?? ""}`).digest("hex");
}
