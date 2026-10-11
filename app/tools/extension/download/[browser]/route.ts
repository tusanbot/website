import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipStore(files: { name: string; data: Buffer }[]) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(file.data.length, 18); local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, name, file.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10); central.writeUInt32LE(crc, 16); central.writeUInt32LE(file.data.length, 20); central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34); central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38); central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + file.data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

export async function GET(_request: Request, context: { params: Promise<{ browser: string }> }) {
  const { browser } = await context.params;
  if (!["chrome", "firefox", "edge"].includes(browser)) return new Response("مرورگر پشتیبانی نمی‌شود.", { status: 404 });
  const root = path.join(process.cwd(), "public", "extension-src", "bookmarks");
  const names = ["manifest.json", "popup.html", "popup.css", "popup.js", "sites.json"];
  const files: { name: string; data: Buffer }[] = [];
  for (const name of names) {
    let data = await readFile(path.join(root, name));
    if (name === "manifest.json" && browser === "firefox") {
      const manifest = JSON.parse(data.toString("utf8"));
      manifest.browser_specific_settings = { gecko: { id: "bookmarks@tusancn.ir", strict_min_version: "109.0" } };
      data = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
    }
    files.push({ name, data });
  }
  files.push({ name: "INSTALL-FA.txt", data: Buffer.from(
    browser === "firefox"
      ? "افزونه بوکمارک‌های کافی‌نت توسن\nاین بسته برای آزمایش و بررسی است. برای نصب عادی و انتشار عمومی Firefox، افزونه باید از طریق Firefox Add-ons امضا شود.\n"
      : "افزونه بوکمارک‌های کافی‌نت توسن\nفایل ZIP را استخراج کنید. در صفحه افزونه‌های مرورگر، Developer mode را فعال کرده و Load unpacked را بزنید و پوشه استخراج‌شده را انتخاب کنید.\n",
    "utf8"
  )});
  const zip = zipStore(files);
  const filename = `tosan-cafenet-bookmarks-${browser}-v1.0.0.zip`;
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
