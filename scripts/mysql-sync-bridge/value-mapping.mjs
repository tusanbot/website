function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Convert values from the Supabase outbox JSON representation to the known
 * MariaDB destination types. JSON-in-text mappings are deliberately narrow:
 * do not stringify arbitrary objects into arbitrary text columns.
 */
export function convertValue(value, column, tableName) {
  if (value === null || value === undefined) return null;
  const type = String(column.DATA_TYPE).toLowerCase();
  const name = String(column.COLUMN_NAME);

  if (type === "json") {
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string") {
      JSON.parse(value);
      return value;
    }
    throw new Error(`Value for JSON column ${name} is not JSON-compatible.`);
  }

  // Supabase text[] and jsonb become JSON arrays/objects in outbox row_data,
  // while the existing cPanel schema stores these two fields as LONGTEXT.
  if (tableName === "blog_posts" && name === "seo_keywords") {
    if (!Array.isArray(value)) {
      throw new Error("blog_posts.seo_keywords must be an array from Supabase text[].");
    }
    return JSON.stringify(value);
  }
  if (tableName === "services_announcements" && name === "documents") {
    if (!Array.isArray(value) && !isPlainObject(value)) {
      throw new Error("services_announcements.documents must be a JSON array or object.");
    }
    return JSON.stringify(value);
  }

  if (["datetime", "timestamp"].includes(type)) {
    if (typeof value !== "string") throw new Error(`Datetime value requires an ISO string for column ${name}.`);
    // MariaDB DATETIME has no timezone. Normalize source timestamptz values to
    // UTC while preserving up to six fractional digits (JS Date alone loses µs).
    const match = /^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})(?:\\.(\\d+))?(Z|[+-]\\d{2}:\\d{2})$/i.exec(value);
    if (!match) throw new Error(`Datetime value must be an ISO timestamp with timezone for column ${name}.`);
    const parsed = new Date(`${match[1]}${match[3]}`);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid datetime value for column ${name}.`);
    const utc = parsed.toISOString().slice(0, 19).replace("T", " ");
    const fraction = (match[2] || "").slice(0, 6).padEnd(6, "0");
    return fraction ? `${utc}.${fraction}` : utc;
  }
  if (type === "date") {
    if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
      throw new Error(`Date value must use YYYY-MM-DD for column ${name}.`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error(`Invalid date value for column ${name}.`);
    }
    return value;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    throw new Error(`Object/array value requires an explicit mapping for column ${name} (${type}).`);
  }
  if (typeof value === "boolean") {
    if (["tinyint", "bit", "boolean"].includes(type)) return value ? 1 : 0;
    throw new Error(`Boolean value requires an explicit mapping for column ${name} (${type}).`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Non-finite numeric value for column ${name}.`);
  }
  return value;
}
