import "server-only";

import { createHash } from "node:crypto";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

const TABLE_ALLOWLIST = new Set([
  "profiles",
  "services",
  "registrations",
  "orders",
  "order_files",
  "order_history",
  "messages",
  "custom_forms",
  "services_announcements",
  "site_settings",
  "goals",
  "sub_goals",
  "financial_transactions",
  "payments",
  "social_platforms",
  "social_categories",
  "social_services",
  "social_orders",
  "social_sync_logs",
  "api_rate_limits",
  "blog_categories",
  "blog_posts",
  "blog_post_services",
  "ai_profiles",
  "ai_sessions",
  "form_versions",
  "traxtor_saved_projects",
  "notifications",
  "support_conversations",
  "support_messages",
  "blog_comments",
  "blog_ratings",
  "blog_reactions",
  "staff_roles",
  "staff_role_assignments",
  "staff_service_access",
  "support_conversation_participants",
  "order_staff_requests",
  "order_commission_ledger",
  "staff_category_access",
  "staff_reviews",
  "support_reviews",
  "staff_bank_accounts",
  "staff_earnings",
  "staff_settlements",
  "staff_financial_adjustments",
  "payout_requests",
  "support_faqs",
  "order_refunds",
  "order_cancellation_requests",
  "member_tags",
  "member_tag_assignments",
  "tag_referral_links",
  "discounts",
  "discount_codes",
  "discount_tag_rules",
  "discount_services",
  "discount_usages",
  "news_announcements",
  "news_sources",
]);
const PRIVATE_TABLE_ALLOWLIST = new Set([
  "blog_post_views",
]);

type PlainObject = Record<string, unknown>;
type SqlValue = string | number | bigint | boolean | Date | Buffer | null;

function executeWithValues<T extends RowDataPacket[]>(
  connection: PoolConnection,
  sql: string,
  values: SqlValue[],
) {
  return connection.execute<T>(sql, values as never);
}

function executeMutation(
  connection: PoolConnection,
  sql: string,
  values: SqlValue[],
) {
  return connection.execute(sql, values as never);
}
type SyncEvent = {
  id: number;
  event_id: string;
  source_database: string;
  schema_name: string;
  table_name: string;
  record_key: PlainObject;
  operation: "insert" | "update" | "delete";
  row_data: PlainObject;
  attempts: number;
};

type ColumnMetadata = RowDataPacket & {
  COLUMN_NAME: string;
  DATA_TYPE: string;
};

type TableMetadata = {
  columns: Map<string, ColumnMetadata>;
  primaryKeys: string[];
};

declare global {
  // Reuse one pool across Next.js route invocations and development reloads.
  // eslint-disable-next-line no-var
  var __tusanMariaDbPool: Pool | undefined;
}

function getPool(): Pool {
  const database = process.env.MYSQL_DATABASE;
  if (database !== "tusancni_test") {
    throw new Error("MariaDB sync is locked to MYSQL_DATABASE=tusancni_test during validation.");
  }
  for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD"] as const) {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  if (!globalThis.__tusanMariaDbPool) {
    globalThis.__tusanMariaDbPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database,
      waitForConnections: true,
      connectionLimit: 3,
      queueLimit: 10,
      charset: "utf8mb4",
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false,
      dateStrings: true,
      connectTimeout: 8000,
      ssl: process.env.MYSQL_SSL === "1" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return globalThis.__tusanMariaDbPool;
}

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function hashKey(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error("Unsafe SQL identifier.");
  return `\x60${value}\x60`;
}

function convertValue(value: unknown, column: ColumnMetadata, tableName: string): SqlValue {
  if (value === null || value === undefined) return null;
  const type = column.DATA_TYPE.toLowerCase();
  const name = column.COLUMN_NAME;

  if (type === "json") {
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string") { JSON.parse(value); return value; }
    throw new Error(`Value for JSON column ${name} is not JSON-compatible.`);
  }
  if (tableName === "blog_posts" && name === "seo_keywords") {
    if (!Array.isArray(value)) throw new Error("blog_posts.seo_keywords must be an array.");
    return JSON.stringify(value);
  }
  if (tableName === "services_announcements" && name === "documents") {
    if (!Array.isArray(value) && !isPlainObject(value)) throw new Error("services_announcements.documents must be a JSON array or object.");
    return JSON.stringify(value);
  }
  if (["datetime", "timestamp"].includes(type)) {
    if (typeof value !== "string") throw new Error(`Datetime value requires an ISO string for ${name}.`);
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/i.exec(value);
    if (!match) throw new Error(`Datetime value must include a timezone for ${name}.`);
    const parsed = new Date(`${match[1]}${match[3]}`);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid datetime for ${name}.`);
    const utc = parsed.toISOString().slice(0, 19).replace("T", " ");
    const fraction = (match[2] || "").slice(0, 6).padEnd(6, "0");
    return fraction ? `${utc}.${fraction}` : utc;
  }
  if (type === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Date must use YYYY-MM-DD for ${name}.`);
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid date for ${name}.`);
    return value;
  }
  if (Array.isArray(value) || isPlainObject(value)) throw new Error(`Object/array value requires an explicit mapping for ${name} (${type}).`);
  if (typeof value === "boolean") {
    if (["tinyint", "bit", "boolean"].includes(type)) return value ? 1 : 0;
    throw new Error(`Boolean value requires an explicit mapping for ${name} (${type}).`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`Non-finite numeric value for ${name}.`);
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  throw new Error(`Unsupported SQL value for ${name}.`);
}

async function getTableMetadata(connection: PoolConnection, tableName: string): Promise<TableMetadata> {
  const [rawColumns] = await connection.execute<RowDataPacket[]>(
    "SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  const columns = rawColumns as ColumnMetadata[];
  if (!columns.length) throw new Error(`Destination table is missing: ${tableName}`);
  const [rawKeys] = await connection.execute<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  const primaryKeys = rawKeys.map((row) => String(row.COLUMN_NAME));
  if (!primaryKeys.length) throw new Error(`Destination table has no primary key: ${tableName}`);
  return { columns: new Map(columns.map((column) => [column.COLUMN_NAME, column])), primaryKeys };
}

function validateEvent(event: SyncEvent): void {
  if (!event || typeof event.event_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.event_id)) {
    throw new Error("Invalid sync event ID.");
  }
  if (event.source_database !== "supabase") throw new Error("Unexpected source database.");
  if (!((event.schema_name === "public" && TABLE_ALLOWLIST.has(event.table_name)) || (event.schema_name === "private" && PRIVATE_TABLE_ALLOWLIST.has(event.table_name)))) throw new Error("Schema/table is not allowlisted.");
  if (!["insert", "update", "delete"].includes(event.operation)) throw new Error("Invalid operation.");
  if (!isPlainObject(event.record_key) || !Object.keys(event.record_key).length) throw new Error("Invalid record key.");
  if (!Number.isSafeInteger(Number(event.id)) || Number(event.id) < 1) throw new Error("Invalid outbox ID.");
  if (!isPlainObject(event.row_data)) throw new Error("Invalid row data.");
}

export async function applyMariaDbSyncEvent(event: SyncEvent): Promise<{ event_id: string; duplicate: boolean; stale?: boolean }> {
  validateEvent(event);
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [receiptRows] = await connection.execute<RowDataPacket[]>(
      "SELECT event_id FROM data_sync_event_receipts WHERE event_id = ? LIMIT 1",
      [event.event_id],
    );
    if (receiptRows.length) {
      await connection.commit();
      return { event_id: event.event_id, duplicate: true };
    }

    const metadata = await getTableMetadata(connection, event.table_name);
    const keyNames = Object.keys(event.record_key).sort();
    const expectedKeys = [...metadata.primaryKeys].sort();
    if (keyNames.length !== expectedKeys.length || keyNames.some((key, index) => key !== expectedKeys[index])) {
      throw new Error(`record_key does not match destination primary key for ${event.table_name}.`);
    }
    for (const key of keyNames) {
      if (event.record_key[key] === null || event.record_key[key] === undefined) throw new Error(`Missing primary key: ${key}`);
    }

    if (event.operation !== "delete") {
      for (const key of Object.keys(event.row_data)) {
        if (!metadata.columns.has(key)) throw new Error(`Unknown destination column: ${event.table_name}.${key}`);
      }
      for (const key of metadata.primaryKeys) {
        if (!(key in event.row_data) || stableJson(event.row_data[key]) !== stableJson(event.record_key[key])) {
          throw new Error(`row_data primary key mismatch: ${key}`);
        }
      }
    }

    const recordKeyHash = hashKey({ schema_name: event.schema_name, table_name: event.table_name, record_key: event.record_key });
    const [versionRows] = await connection.execute<RowDataPacket[]>(
      "SELECT source_outbox_id FROM data_sync_record_versions WHERE record_key_hash = ? FOR UPDATE",
      [recordKeyHash],
    );
    const incomingVersion = Number(event.id);
    const lastVersion = versionRows.length ? Number(versionRows[0].source_outbox_id) : 0;

    if (incomingVersion > lastVersion) {
      const where = metadata.primaryKeys.map((key) => `${quoteIdentifier(key)} = ?`).join(" AND ");
      const keyValues = metadata.primaryKeys.map((key) => convertValue(event.record_key[key], metadata.columns.get(key)!, event.table_name));
      const table = quoteIdentifier(event.table_name);
      if (event.operation === "delete") {
        await executeMutation(connection, `DELETE FROM ${table} WHERE ${where}`, keyValues);
      } else {
        const names = Object.keys(event.row_data);
        if (!names.length) throw new Error("row_data cannot be empty.");
        const values = names.map((name) => convertValue(event.row_data[name], metadata.columns.get(name)!, event.table_name));
        const [existing] = await executeWithValues<RowDataPacket[]>(connection, `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1 FOR UPDATE`, keyValues);
        if (existing.length) {
          const updateNames = names.filter((name) => !metadata.primaryKeys.includes(name));
          if (updateNames.length) {
            const setSql = updateNames.map((name) => `${quoteIdentifier(name)} = ?`).join(", ");
            const updateValues = updateNames.map((name) => convertValue(event.row_data[name], metadata.columns.get(name)!, event.table_name));
            await executeMutation(connection, `UPDATE ${table} SET ${setSql} WHERE ${where}`, [...updateValues, ...keyValues]);
          }
        } else {
          const columnSql = names.map(quoteIdentifier).join(", ");
          const placeholders = names.map(() => "?").join(", ");
          await executeMutation(connection, `INSERT INTO ${table} (${columnSql}) VALUES (${placeholders})`, values);
        }
      }

      await connection.execute(
        "INSERT INTO data_sync_record_versions (record_key_hash, schema_name, table_name, record_key_json, source_outbox_id, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE record_key_json = VALUES(record_key_json), source_outbox_id = VALUES(source_outbox_id), updated_at = VALUES(updated_at)",
        [recordKeyHash, event.schema_name, event.table_name, JSON.stringify(event.record_key), String(incomingVersion)],
      );
    }

    await connection.execute(
      "INSERT INTO data_sync_event_receipts (event_id, source_outbox_id, schema_name, table_name, record_key_hash, operation, applied_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))",
      [event.event_id, String(event.id), event.schema_name, event.table_name, recordKeyHash, event.operation],
    );
    await connection.commit();
    return { event_id: event.event_id, duplicate: false, stale: incomingVersion <= lastVersion };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkMariaDbSyncConnection(): Promise<void> {
  await getPool().query("SELECT 1");
}
