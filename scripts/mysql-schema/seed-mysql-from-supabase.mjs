#!/usr/bin/env node
/**
 * Initial, idempotent Supabase -> MySQL baseline seed.
 *
 * Safety:
 * - Read-only against Supabase.
 * - Writes are locked to MYSQL_DATABASE=tusancni_test.
 * - Dry-run is the default; --apply is mandatory for writes.
 * - It refuses to run until every source column and primary key exists in MySQL.
 * - It never deletes destination rows. Replay the outbox after baseline to catch
 *   concurrent changes; reconcile deletions separately before cutover.
 *
 * Run only after the reviewed MySQL schema and sync metadata tables exist and
 * after the Supabase outbox migration is active. Keep the dispatcher stopped
 * until this baseline completes.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import mysql from "mysql2/promise";
import { convertValue } from "../mysql-sync-bridge/value-mapping.mjs";

const args = new Set(process.argv.slice(2));
const getArg = (prefix, fallback) => process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
const batchSize = Math.max(50, Math.min(Number(getArg("--batch-size=", "250")) || 250, 500));
const apply = args.has("--apply");
const showHelp = args.has("--help");

if (showHelp) {
  console.log("Usage: node scripts/mysql-schema/seed-mysql-from-supabase.mjs [--apply] [--tables=a,b] [--batch-size=250]");
  console.log("Dry-run is default. Writes are restricted to tusancni_test.");
  process.exit(0);
}

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.MYSQL_DATABASE !== "tusancni_test") {
  throw new Error("Baseline seed is locked to MYSQL_DATABASE=tusancni_test.");
}

const manifestPath = path.join(process.cwd(), "scripts/mysql-schema/supabase-schema-manifest-2026-10-31.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const publicTables = manifest.tables.filter((table) => table.name.startsWith("public."));
const privateTables = manifest.tables.filter((table) => table.name.startsWith("private."));
const requestedTables = getArg("--tables=", "").split(",").map((x) => x.trim()).filter(Boolean);
const selectedTables = requestedTables.length
  ? publicTables.filter((table) => requestedTables.includes(table.name.slice(7)))
  : publicTables;
if (requestedTables.some((name) => !publicTables.some((table) => table.name === `public.${name}`))) {
  throw new Error("--tables contains a table not present in the public schema manifest.");
}
if (!selectedTables.length) throw new Error("No source tables selected.");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 10,
  charset: "utf8mb4",
  supportBigNumbers: true,
  bigNumberStrings: true,
  decimalNumbers: false,
  dateStrings: true,
  connectTimeout: 8000,
  ssl: process.env.MYSQL_SSL === "1" ? { rejectUnauthorized: true } : undefined,
});

function quoteIdentifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error("Unsafe SQL identifier.");
  return "`" + value + "`";
}

async function getDestinationMetadata(connection, tableName, sourceTable) {
  const [rawColumns] = await connection.execute(
    "SELECT COLUMN_NAME, DATA_TYPE, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  if (!rawColumns.length) throw new Error(`Destination table is missing: ${tableName}`);
  const columns = new Map(rawColumns.map((column) => [column.COLUMN_NAME, column]));
  const sourceColumns = sourceTable.columns.map((column) => column.name);
  const missing = sourceColumns.filter((name) => !columns.has(name));
  if (missing.length) throw new Error(`Destination ${tableName} is missing source columns: ${missing.join(", ")}`);

  const [rawKeys] = await connection.execute(
    "SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION",
    [tableName],
  );
  const primaryKeys = rawKeys.map((row) => row.COLUMN_NAME);
  const expectedKeys = [...(sourceTable.primary_keys || [])];
  if (primaryKeys.length !== expectedKeys.length || primaryKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`Destination primary key differs from Supabase for ${tableName}: expected [${expectedKeys.join(",")}], got [${primaryKeys.join(",")}]`);
  }
  return { columns, primaryKeys, sourceColumns };
}

async function validateAllTables(connection) {
  const metadata = new Map();
  for (const sourceTable of selectedTables) {
    const tableName = sourceTable.name.slice(7);
    metadata.set(tableName, await getDestinationMetadata(connection, tableName, sourceTable));
  }
  if (!requestedTables.length) {
    const privateView = privateTables.find((table) => table.name === "private.blog_post_views");
    if (privateView) metadata.set("blog_post_views", await getDestinationMetadata(connection, "blog_post_views", privateView));
  }
  return metadata;
}

async function sourceCount(tableName) {
  const { count, error } = await supabase.schema("public").from(tableName).select("*", { count: "exact", head: true });
  if (error) throw new Error(`Supabase count failed for ${tableName}: ${error.message}`);
  return Number(count || 0);
}

function buildUpsertSql(tableName, names, primaryKeys, rowCount) {
  const columns = names.map(quoteIdentifier).join(", ");
  const rowPlaceholders = `(${names.map(() => "?").join(", ")})`;
  const valuesSql = Array.from({ length: rowCount }, () => rowPlaceholders).join(", ");
  const updateNames = names.filter((name) => !primaryKeys.includes(name));
  const updateSql = updateNames.length
    ? updateNames.map((name) => `${quoteIdentifier(name)} = VALUES(${quoteIdentifier(name)})`).join(", ")
    : `${quoteIdentifier(primaryKeys[0])} = VALUES(${quoteIdentifier(primaryKeys[0])})`;
  return `INSERT INTO ${quoteIdentifier(tableName)} (${columns}) VALUES ${valuesSql} ON DUPLICATE KEY UPDATE ${updateSql}`;
}

async function upsertBatch(connection, tableName, rows, metadata) {
  if (!rows.length) return;
  const names = metadata.sourceColumns;
  const sql = buildUpsertSql(tableName, names, metadata.primaryKeys, rows.length);
  const values = [];
  for (const row of rows) {
    for (const name of names) {
      if (!(name in row)) throw new Error(`Source row is missing ${tableName}.${name}`);
      values.push(convertValue(row[name], metadata.columns.get(name), tableName));
    }
  }
  await connection.beginTransaction();
  try {
    await connection.execute(sql, values);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function seedPublicTable(connection, table, metadata) {
  const tableName = table.name.slice(7);
  let offset = 0;
  let processed = 0;
  while (true) {
    let query = supabase.schema("public").from(tableName).select("*");
    for (const key of table.primary_keys || []) query = query.order(key, { ascending: true });
    const { data, error } = await query.range(offset, offset + batchSize - 1);
    if (error) throw new Error(`Supabase read failed for ${tableName} at offset ${offset}: ${error.message}`);
    const rows = data || [];
    if (!rows.length) break;
    await upsertBatch(connection, tableName, rows, metadata);
    processed += rows.length;
    offset += rows.length;
    if (rows.length < batchSize) break;
  }
  return processed;
}

async function seedPrivateBlogViews(connection, metadata) {
  let afterId = null;
  let processed = 0;
  while (true) {
    const { data, error } = await supabase.rpc("export_private_blog_post_views", {
      p_after_id: afterId,
      p_limit: batchSize,
    });
    if (error) throw new Error(`Private blog views export failed: ${error.message}`);
    const rows = data || [];
    if (!rows.length) break;
    await upsertBatch(connection, "blog_post_views", rows, metadata);
    processed += rows.length;
    afterId = rows[rows.length - 1].id;
    if (rows.length < batchSize) break;
  }
  return processed;
}

async function main() {
  const connection = await pool.getConnection();
  try {
    const metadata = await validateAllTables(connection);
    console.log(`Schema validation passed for ${metadata.size} destination tables.`);
    if (!apply) {
      const counts = [];
      for (const table of selectedTables) {
        const name = table.name.slice(7);
        counts.push({ table: name, source_rows: await sourceCount(name) });
      }
      console.log(JSON.stringify({ mode: "dry-run", database: process.env.MYSQL_DATABASE, batch_size: batchSize, tables: counts }, null, 2));
      console.log("No rows were written. Re-run with --apply only after reviewing the schema and confirming the test database.");
      return;
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const results = [];
    try {
      for (const table of selectedTables) {
        const name = table.name.slice(7);
        const count = await seedPublicTable(connection, table, metadata.get(name));
        const [destinationRows] = await connection.query(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(name)}`);
        results.push({ table: name, copied_or_updated: count, destination_rows: Number(destinationRows[0]?.total || 0) });
        console.log(`Seeded ${name}: ${count} rows processed.`);
      }
      if (!requestedTables.length) {
        const privateView = privateTables.find((table) => table.name === "private.blog_post_views");
        if (privateView) {
          const count = await seedPrivateBlogViews(connection, metadata.get("blog_post_views"));
          const [destinationRows] = await connection.query("SELECT COUNT(*) AS total FROM `blog_post_views`");
          results.push({ table: "private.blog_post_views", copied_or_updated: count, destination_rows: Number(destinationRows[0]?.total || 0) });
          console.log(`Seeded private.blog_post_views: ${count} rows processed.`);
        }
      }
    } finally {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    }
    console.log(JSON.stringify({ mode: "applied", database: process.env.MYSQL_DATABASE, results }, null, 2));
    console.log("Baseline complete. Keep the dispatcher paused until you review counts, then replay the captured outbox backlog.");
  } finally {
    connection.release();
  }
}

main()
  .catch((error) => {
    console.error("Supabase-to-MySQL baseline seed stopped:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
