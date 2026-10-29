import http from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import mysql from "mysql2/promise";

const PORT = Number(process.env.PORT || 8788);
const TOKEN = process.env.MYSQL_SYNC_BRIDGE_TOKEN || "";
const MAX_BODY_BYTES = 1_000_000;
const TABLE_ALLOWLIST = new Set([
  "blog_posts",
  "blog_categories",
  "blog_post_services",
  "blog_comments",
  "blog_reactions",
  "blog_ratings",
  "services_announcements",
]);

const requiredEnv = [
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
  "MYSQL_SYNC_BRIDGE_TOKEN",
];
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
if (process.env.MYSQL_SYNC_BRIDGE_TOKEN.length < 32) {
  throw new Error("MYSQL_SYNC_BRIDGE_TOKEN must be at least 32 characters.");
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 20,
  charset: "utf8mb4",
  supportBigNumbers: true,
  bigNumberStrings: true,
  decimalNumbers: false,
  dateStrings: true,
  connectTimeout: 8000,
  ssl: process.env.MYSQL_SSL === "1" ? { rejectUnauthorized: true } : undefined,
});

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function keyHash(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function quoteIdentifier(identifier) {
  // Only identifiers loaded from information_schema or the static table allowlist reach here.
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) throw new Error("Unsafe SQL identifier.");
  return `\x60${identifier}\x60`;
}

async function getTableMetadata(conn, tableName) {
  const [columns] = await conn.execute(
    "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  if (!columns.length) throw new Error(`Destination table is missing: ${tableName}`);
  const [primaryRows] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  const primaryKeys = primaryRows.map((row) => row.COLUMN_NAME);
  if (!primaryKeys.length) throw new Error(`Destination table has no primary key: ${tableName}`);
  return { columns, primaryKeys, columnMap: new Map(columns.map((column) => [column.COLUMN_NAME, column])) };
}

function validateEvent(event) {
  if (!isPlainObject(event)) throw Object.assign(new Error("Event must be an object."), { statusCode: 400 });
  if (typeof event.event_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.event_id)) {
    throw Object.assign(new Error("Invalid event_id."), { statusCode: 400 });
  }
  if (event.schema_name !== "public" || typeof event.table_name !== "string" || !TABLE_ALLOWLIST.has(event.table_name)) {
    throw Object.assign(new Error("Schema/table is not allowlisted."), { statusCode: 403 });
  }
  if (!["insert", "update", "delete"].includes(event.operation)) {
    throw Object.assign(new Error("Invalid operation."), { statusCode: 400 });
  }
  if (!isPlainObject(event.record_key) || !Object.keys(event.record_key).length) {
    throw Object.assign(new Error("record_key must be a non-empty object."), { statusCode: 400 });
  }
  if (!Number.isSafeInteger(Number(event.source_outbox_id)) || Number(event.source_outbox_id) < 1) {
    throw Object.assign(new Error("Invalid source_outbox_id."), { statusCode: 400 });
  }
  if (!isPlainObject(event.row_data)) throw Object.assign(new Error("row_data must be an object."), { statusCode: 400 });
  return event;
}

function convertValue(value, column) {
  if (value === null || value === undefined) return value ?? null;
  const type = String(column.DATA_TYPE).toLowerCase();
  if (type === "json") {
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string") {
      JSON.parse(value);
      return value;
    }
    throw new Error(`Value for JSON column ${column.COLUMN_NAME} is not JSON-compatible.`);
  }
  if (["datetime", "timestamp"].includes(type)) {
    if (typeof value !== "string") throw new Error(`Datetime value requires an ISO string for column ${column.COLUMN_NAME}.`);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid datetime value for column ${column.COLUMN_NAME}.`);
    return parsed.toISOString().replace("T", " ").replace("Z", "");
  }
  if (type === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Date value must use YYYY-MM-DD for column ${column.COLUMN_NAME}.`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new Error(`Invalid date value for column ${column.COLUMN_NAME}.`);
    }
    return value;
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    throw new Error(`Object/array value requires an explicit mapping for column ${column.COLUMN_NAME} (${type}).`);
  }
  if (typeof value === "boolean") {
    if (["tinyint", "bit", "boolean"].includes(type)) return value ? 1 : 0;
    throw new Error(`Boolean value requires an explicit mapping for column ${column.COLUMN_NAME} (${type}).`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`Non-finite numeric value for column ${column.COLUMN_NAME}.`);
  }
  return value;
}

async function applyEvent(event) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [receipts] = await conn.execute(
      "SELECT event_id FROM data_sync_event_receipts WHERE event_id = ? LIMIT 1",
      [event.event_id],
    );
    if (receipts.length) {
      await conn.commit();
      return { event_id: event.event_id, duplicate: true };
    }

    const tableName = event.table_name;
    const metadata = await getTableMetadata(conn, tableName);
    const keyNames = Object.keys(event.record_key).sort();
    const expectedKeyNames = [...metadata.primaryKeys].sort();
    if (keyNames.length !== expectedKeyNames.length || keyNames.some((name, i) => name !== expectedKeyNames[i])) {
      throw new Error(`record_key does not match destination primary key for ${tableName}.`);
    }
    for (const keyName of keyNames) {
      if (event.record_key[keyName] === null || event.record_key[keyName] === undefined) {
        throw new Error(`Primary-key value is missing: ${keyName}.`);
      }
    }

    const row = event.row_data;
    if (event.operation !== "delete") {
      for (const key of Object.keys(row)) {
        if (!metadata.columnMap.has(key)) throw new Error(`Source column is not present in destination table: ${tableName}.${key}`);
      }
      for (const keyName of metadata.primaryKeys) {
        if (!(keyName in row) || stableJson(row[keyName]) !== stableJson(event.record_key[keyName])) {
          throw new Error(`row_data primary key mismatch for ${tableName}.${keyName}`);
        }
      }
    }

    const recordKeyHash = keyHash({ schema_name: "public", table_name: tableName, record_key: event.record_key });
    const [versions] = await conn.execute(
      "SELECT source_outbox_id FROM data_sync_record_versions WHERE record_key_hash = ? FOR UPDATE",
      [recordKeyHash],
    );
    const incomingVersion = Number(event.source_outbox_id);
    const lastVersion = versions.length ? Number(versions[0].source_outbox_id) : 0;
    if (incomingVersion > lastVersion) {
      const where = metadata.primaryKeys.map((name) => `${quoteIdentifier(name)} = ?`).join(" AND ");
      const keyValues = metadata.primaryKeys.map((name) => convertValue(event.record_key[name], metadata.columnMap.get(name)));
      const tableSql = quoteIdentifier(tableName);

      if (event.operation === "delete") {
        await conn.execute(`DELETE FROM ${tableSql} WHERE ${where}`, keyValues);
      } else {
        const names = Object.keys(row);
        if (!names.length) throw new Error("row_data cannot be empty for insert/update.");
        const values = names.map((name) => convertValue(row[name], metadata.columnMap.get(name)));
        const existsSql = `SELECT 1 FROM ${tableSql} WHERE ${where} LIMIT 1 FOR UPDATE`;
        const [existing] = await conn.execute(existsSql, keyValues);
        if (existing.length) {
          const updateNames = names.filter((name) => !metadata.primaryKeys.includes(name));
          if (updateNames.length) {
            const setSql = updateNames.map((name) => `${quoteIdentifier(name)} = ?`).join(", ");
            const updateValues = updateNames.map((name) => convertValue(row[name], metadata.columnMap.get(name)));
            await conn.execute(`UPDATE ${tableSql} SET ${setSql} WHERE ${where}`, [...updateValues, ...keyValues]);
          }
        } else {
          const columnSql = names.map(quoteIdentifier).join(", ");
          const placeholders = names.map(() => "?").join(", ");
          await conn.execute(`INSERT INTO ${tableSql} (${columnSql}) VALUES (${placeholders})`, values);
        }
      }

      await conn.execute(
        "INSERT INTO data_sync_record_versions (record_key_hash, schema_name, table_name, record_key_json, source_outbox_id, updated_at) VALUES (?, 'public', ?, ?, ?, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE record_key_json = VALUES(record_key_json), source_outbox_id = VALUES(source_outbox_id), updated_at = VALUES(updated_at)",
        [recordKeyHash, tableName, JSON.stringify(event.record_key), String(incomingVersion)],
      );
    }

    await conn.execute(
      "INSERT INTO data_sync_event_receipts (event_id, source_outbox_id, schema_name, table_name, record_key_hash, operation, applied_at) VALUES (?, ?, 'public', ?, ?, ?, CURRENT_TIMESTAMP(3))",
      [event.event_id, String(event.source_outbox_id), tableName, recordKeyHash, event.operation],
    );
    await conn.commit();
    return { event_id: event.event_id, duplicate: false, stale: incomingVersion <= lastVersion };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    try {
      await pool.query("SELECT 1");
      return send(res, 200, { status: "ok" });
    } catch {
      return send(res, 503, { status: "unavailable" });
    }
  }

  if (req.method !== "POST" || req.url !== "/v1/events") {
    return send(res, 404, { error: "Not found." });
  }
  if (!safeEqual(req.headers.authorization || "", `Bearer ${TOKEN}`)) {
    return send(res, 401, { error: "Unauthorized." });
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) {
    return send(res, 415, { error: "Content-Type must be application/json." });
  }

  try {
    const event = validateEvent(await readJson(req));
    const ack = await applyEvent(event);
    return send(res, 200, ack);
  } catch (error) {
    const status = Number(error?.statusCode) || (error?.code === "ER_DUP_ENTRY" ? 409 : 400);
    // Do not log request bodies, credentials, or SQL values.
    console.error("Sync event rejected/failed:", {
      status,
      message: String(error?.message || "Unknown error").slice(0, 300),
    });
    return send(res, status >= 400 && status < 600 ? status : 500, {
      error: status >= 500 ? "Sync event could not be applied." : String(error?.message || "Invalid event."),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MariaDB sync bridge listening on 127.0.0.1:${PORT}`);
});

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
