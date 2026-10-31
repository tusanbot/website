import test from "node:test";
import assert from "node:assert/strict";
import { convertValue } from "./value-mapping.mjs";

const textColumn = (name) => ({ COLUMN_NAME: name, DATA_TYPE: "longtext" });

test("serializes Supabase blog_posts.seo_keywords text[] to JSON text", () => {
  assert.equal(
    convertValue(["tax", "registration", "فارسی"], textColumn("seo_keywords"), "blog_posts"),
    '["tax","registration","فارسی"]',
  );
});

test("preserves empty seo_keywords arrays as JSON arrays", () => {
  assert.equal(convertValue([], textColumn("seo_keywords"), "blog_posts"), "[]");
});

test("rejects malformed seo_keywords source shape", () => {
  assert.throws(
    () => convertValue("tax,registration", textColumn("seo_keywords"), "blog_posts"),
    /must be an array/,
  );
});

test("serializes services_announcements.documents JSONB arrays to JSON text", () => {
  assert.equal(
    convertValue([{ title: "کارت ملی", required: true }], textColumn("documents"), "services_announcements"),
    '[{"title":"کارت ملی","required":true}]',
  );
});

test("serializes services_announcements.documents JSONB objects to JSON text", () => {
  assert.equal(
    convertValue({ items: ["a", "b"] }, textColumn("documents"), "services_announcements"),
    '{"items":["a","b"]}',
  );
});

test("allows null for nullable JSON-backed fields", () => {
  assert.equal(convertValue(null, textColumn("seo_keywords"), "blog_posts"), null);
  assert.equal(convertValue(null, textColumn("documents"), "services_announcements"), null);
});

test("does not stringify arbitrary objects into unrelated text columns", () => {
  assert.throws(
    () => convertValue({ unsafe: true }, textColumn("content"), "blog_posts"),
    /requires an explicit mapping/,
  );
});

test("keeps ordinary scalar values unchanged", () => {
  assert.equal(convertValue("plain text", textColumn("content"), "blog_posts"), "plain text");
});

test("normalizes offset timestamps to UTC and preserves microseconds", () => {
  assert.equal(
    convertValue("2026-10-29T12:30:00.123456+03:30", { COLUMN_NAME: "created_at", DATA_TYPE: "datetime" }, "blog_posts"),
    "2026-10-29 09:00:00.123456",
  );
});

test("rejects timezone-free datetime strings to avoid ambiguous interpretation", () => {
  assert.throws(
    () => convertValue("2026-10-29 12:30:00", { COLUMN_NAME: "created_at", DATA_TYPE: "datetime" }, "blog_posts"),
    /ISO timestamp with timezone/,
  );
});

test("validates calendar dates with YYYY-MM-DD", () => {
  assert.equal(convertValue("2026-10-29", { COLUMN_NAME: "some_date", DATA_TYPE: "date" }, "example"), "2026-10-29");
  assert.throws(
    () => convertValue("2026-02-30", { COLUMN_NAME: "some_date", DATA_TYPE: "date" }, "example"),
    /Invalid date/,
  );
});
