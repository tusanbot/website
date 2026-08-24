import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function encryptionKey() {
  const secret = process.env.AI_PROFILE_ENCRYPTION_KEY;
  if (!secret) throw new Error("AI_PROFILE_ENCRYPTION_KEY is not configured");
  const value = Buffer.from(secret, "base64");
  if (value.length !== KEY_BYTES) throw new Error("AI_PROFILE_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return value;
}

export function hashApiKey(value: string) {
  return createHash("sha256").update(value.trim(), "utf8").digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function encryptApiKey(apiKey: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptApiKey(payload: string) {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) throw new Error("Invalid encrypted API key");
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}
