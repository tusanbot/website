#!/usr/bin/env node
/**
 * Read-only MySQL schema inventory for the cPanel migration pilot.
 *
 * Reads only INFORMATION_SCHEMA metadata. It does not SELECT application rows,
 * create/alter/drop objects, or print connection credentials.
 *
 * Run after loading the private migration environment:
 *   set -a; source .env.migration; set +a
 *   node scripts/inventory-mysql-schema.mjs > ~/mysql-schema-inventory.json
 */
import mysql from "mysql2/promise";

const required = ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error("Missing required environment variables: " + missing.join(", "));
  process.exit(2);
}

const connectionOptions = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectTimeout: 10000,
  multipleStatements: false,
  ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
};

let connection;
try {
  connection = await mysql.createConnection(connectionOptions);
  const db = process.env.MYSQL_DATABASE;
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME AS table_name, TABLE_TYPE AS table_type, ENGINE AS engine,
            TABLE_COLLATION AS table_collation, TABLE_ROWS AS estimated_rows
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [db],
  );
  const [columns] = await connection.execute(
    `SELECT TABLE_NAME AS table_name, ORDINAL_POSITION AS ordinal_position,
            COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type,
            IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default,
            EXTRA AS extra, COLUMN_KEY AS column_key, CHARACTER_SET_NAME AS character_set_name,
            COLLATION_NAME AS collation_name, GENERATION_EXPRESSION AS generation_expression
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [db],
  );
  const [indexes] = await connection.execute(
    `SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, NON_UNIQUE AS non_unique,
            SEQ_IN_INDEX AS sequence_in_index, COLUMN_NAME AS column_name,
            COLLATION AS collation, SUB_PART AS sub_part, INDEX_TYPE AS index_type,
            EXPRESSION AS expression
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [db],
  );
  const [constraints] = await connection.execute(
    `SELECT tc.TABLE_NAME AS table_name, tc.CONSTRAINT_NAME AS constraint_name,
            tc.CONSTRAINT_TYPE AS constraint_type,
            kcu.COLUMN_NAME AS column_name, kcu.ORDINAL_POSITION AS ordinal_position,
            kcu.REFERENCED_TABLE_SCHEMA AS referenced_schema,
            kcu.REFERENCED_TABLE_NAME AS referenced_table,
            kcu.REFERENCED_COLUMN_NAME AS referenced_column,
            rc.UPDATE_RULE AS update_rule, rc.DELETE_RULE AS delete_rule
       FROM information_schema.TABLE_CONSTRAINTS tc
       LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
         ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
        AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON tc.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        AND tc.TABLE_NAME = rc.TABLE_NAME
        AND tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE tc.CONSTRAINT_SCHEMA = ?
      ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
    [db],
  );
  const [checks] = await connection.execute(
    `SELECT tc.TABLE_NAME AS table_name, tc.CONSTRAINT_NAME AS constraint_name,
            cc.CHECK_CLAUSE AS check_clause
       FROM information_schema.TABLE_CONSTRAINTS tc
       JOIN information_schema.CHECK_CONSTRAINTS cc
         ON tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE tc.CONSTRAINT_SCHEMA = ? AND tc.CONSTRAINT_TYPE = 'CHECK'
      ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME`,
    [db],
  );
  const [views] = await connection.execute(
    `SELECT TABLE_NAME AS view_name, VIEW_DEFINITION AS view_definition,
            CHECK_OPTION AS check_option, IS_UPDATABLE AS is_updatable,
            SECURITY_TYPE AS security_type
       FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [db],
  );

  const output = {
    generated_at_utc: new Date().toISOString(),
    database: db,
    source: "MySQL INFORMATION_SCHEMA (metadata only)",
    read_only: true,
    counts: {
      tables_and_views: tables.length,
      columns: columns.length,
      index_entries: indexes.length,
      constraint_column_entries: constraints.length,
      check_constraints: checks.length,
      views: views.length,
    },
    tables,
    columns,
    indexes,
    constraints,
    checks,
    views,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
} catch (error) {
  console.error("Schema inventory failed: " + (error?.message || String(error)));
  process.exitCode = 1;
} finally {
  if (connection) await connection.end().catch(() => {});
}
