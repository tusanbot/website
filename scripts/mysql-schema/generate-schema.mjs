#!/usr/bin/env node
/**
 * Generate a review-only MariaDB schema draft from the checked-in Supabase
 * metadata snapshot. This script never connects to or changes a database.
 *
 * Usage:
 *   node scripts/mysql-schema/generate-schema.mjs [output.sql]
 *
 * Partial indexes, expression indexes, PostgreSQL-only index methods, and
 * CHECK expressions are reported as comments for manual translation. The
 * generated DDL is a fresh-schema baseline, not an ALTER migration for an
 * existing database.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "scripts/mysql-schema/supabase-schema-manifest-2026-10-31.json");
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const warnings = [];
const tableNames = new Set(manifest.tables.map((table) => table.name.split(".").at(-1)));
const detailByTable = new Map();
for (const col of manifest.columns_detail || []) {
  const key = col.table_name;
  if (!detailByTable.has(key)) detailByTable.set(key, new Map());
  detailByTable.get(key).set(col.column_name, col);
}
const indexedTextColumns = new Map();
for (const index of manifest.indexes || []) {
  const def = index.indexdef || "";
  const table = index.tablename;
  const match = def.match(/USING\s+btree\s*\((.*)\)(?:\s+WHERE\s+.*)?$/i);
  if (!match || /\bWHERE\b/i.test(def) || /\b(lower|upper|coalesce|jsonb_path_ops)\s*\(/i.test(match?.[1] || "")) continue;
  for (const raw of match[1].split(",")) {
    const column = raw.trim().replace(/\s+(ASC|DESC)(\s+NULLS\s+(FIRST|LAST))?$/i, "").replace(/^"|"$/g, "");
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) continue;
    const key = `${table}.${column}`;
    indexedTextColumns.set(key, true);
  }
}
const quote = (value) => "`" + String(value).replace(/\`/g, "``") + "`";
const normalizeDefault = (value, type) => {
  if (!value) return null;
  const v = value.trim();
  if (/^(now\(\)|CURRENT_TIMESTAMP(?:\(\))?)$/i.test(v)) return "CURRENT_TIMESTAMP(3)";
  if (/^(gen_random_uuid\(\)|extensions\.uuid_generate_v4\(\)|uuid_generate_v4\(\))$/i.test(v)) return "(UUID())";
  if (/^(true|false)$/i.test(v)) return /^true$/i.test(v) ? "1" : "0";
  if (/^'true'::boolean$/i.test(v)) return "1";
  if (/^'false'::boolean$/i.test(v)) return "0";
  if (/^'\[\]'::jsonb$/i.test(v) || /^'\{\}'::text\[\]$/i.test(v)) return "(JSON_ARRAY())";
  if (/^'\{\}'::jsonb$/i.test(v)) return "(JSON_OBJECT())";
  if (/^CURRENT_DATE$/i.test(v)) return "CURRENT_DATE";
  const quoted = v.match(/^'((?:[^']|'')*)'::(?:text|character varying|varchar)$/i);
  if (quoted) return "'" + quoted[1].replace(/''/g, "''") + "'";
  const numeric = v.match(/^-?\d+(?:\.\d+)?$/);
  if (numeric) return v;
  const castNumeric = v.match(/^(-?\\d+(?:\\.\\d+)?)::(?:integer|int4|int8|smallint|numeric)$/i);
  if (castNumeric) return castNumeric[1];
  if (/^NULL$/i.test(v)) return "NULL";
  warnings.push(`Untranslated default: ${v}`);
  return null;
};
function translateCheck(expression) {
  let value = expression.trim();
  value = value.replace(/::(?:text|character varying|varchar|numeric|integer|int4|int8|smallint|boolean|bool)\b/gi, "");
  value = value.replace(/TRIM\\(BOTH FROM ([^)]+)\\)/gi, "TRIM($1)");
  value = value.replace(/\\bbtrim\\(/gi, "TRIM(");
  value = value.replace(/\\bchar_length\\b/gi, "CHAR_LENGTH");
  value = value.replace(/([a-z_][a-z0-9_]*)\\s*=\\s*ANY\\s*\\(\\s*\\(*\\s*ARRAY\\[([^\\]]*)\\]\\s*\\)*\\s*\\)/gi, (_all, column, rawValues) => {
    const values = rawValues.split(",").map((item) => item.trim().replace(/::(?:text|character varying|varchar)\\b/gi, ""));
    return \`\${column} IN (\${values.join(", ")})\`;
  });
  if (/::|\\bANY\\b|\\bARRAY\\b|TRIM\\(BOTH FROM/i.test(value)) return null;
  return value;
}
function mysqlType(table, col) {
  const detail = detailByTable.get(table)?.get(col.name);
  const format = col.format || detail?.udt_name || col.data_type;
  if (format === "uuid") return "CHAR(36) CHARACTER SET ascii COLLATE ascii_bin";
  if (format === "timestamptz" || format === "timestamp with time zone" || format === "timestamp without time zone") return "DATETIME(3)";
  if (format === "date") return "DATE";
  if (format === "bool" || format === "boolean") return "TINYINT(1)";
  if (format === "int2" || format === "smallint") return "SMALLINT";
  if (format === "int4" || format === "integer") return "INT";
  if (format === "int8" || format === "bigint") return "BIGINT";
  if (format === "numeric" || format === "decimal") {
    const p = detail?.numeric_precision || 20;
    const s = detail?.numeric_scale || 6;
    return `DECIMAL(${p},${Math.min(s,p)})`;
  }
  if (format === "jsonb" || format === "json") return "JSON";
  if (format === "_text" || format === "ARRAY") return "JSON";
  if (format === "varchar" || col.data_type === "character varying") {
    return `VARCHAR(${Math.min(detail?.character_maximum_length || 191, 16383)})`;
  }
  if (format === "text") {
    return indexedTextColumns.has(`${table}.${col.name}`) ? "VARCHAR(191)" : "LONGTEXT";
  }
  if (format === "bytea") return "LONGBLOB";
  warnings.push(`Unknown type ${format} at ${table}.${col.name}; emitted LONGTEXT`);
  return "LONGTEXT";
}
const fkGroups = new Map();
for (const fk of manifest.foreign_keys || []) {
  if (!["public", "private"].includes(fk.table_schema)) continue;
  if (!["public", "private"].includes(fk.foreign_table_schema)) {
    warnings.push(`Skipped external FK ${fk.table_schema}.${fk.table_name}.${fk.constraint_name} -> ${fk.foreign_table_schema}.${fk.foreign_table_name}`);
    continue;
  }
  const key = `${fk.table_schema}.${fk.table_name}.${fk.constraint_name}`;
  if (!fkGroups.has(key)) fkGroups.set(key, []);
  fkGroups.get(key).push(fk);
}
const indexStatements = [];
for (const index of manifest.indexes || []) {
  const def = index.indexdef || "";
  const table = index.tablename;
  const schemaMatch = def.match(/ON\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+USING/i);
  const schema = schemaMatch?.[1];
  if (!tableNames.has(table) || !["public", "private"].includes(schema)) continue;
  if (/\bWHERE\b/i.test(def) || !/USING\s+btree/i.test(def) || /\b(lower|upper|coalesce)\s*\(/i.test(def)) {
    warnings.push(`Skipped non-portable index ${index.indexname}: ${def}`);
    continue;
  }
  const match = def.match(/USING\s+btree\s*\((.*)\)$/i);
  if (!match) {
    warnings.push(`Could not parse index ${index.indexname}: ${def}`);
    continue;
  }
  const cols = match[1].split(",").map((part) => {
    const name = part.trim().replace(/\s+(ASC|DESC)(\s+NULLS\s+(FIRST|LAST))?$/i, "").replace(/^"|"$/g, "");
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? quote(name) : null;
  });
  if (cols.some((x) => !x)) {
    warnings.push(`Skipped expression index ${index.indexname}: ${def}`);
    continue;
  }
  const unique = /CREATE\s+UNIQUE\s+INDEX/i.test(def);
  const name = index.indexname.slice(0, 64);
  const primary = (manifest.tables.find((t) => t.name.split(".").at(-1) === table)?.primary_keys || []).join(",");
  const indexed = match[1].split(",").map((part) => part.trim().replace(/\s+(ASC|DESC)(\s+NULLS\s+(FIRST|LAST))?$/i, "").replace(/^"|"$/g, "")).join(",");
  if (unique && indexed === primary) continue;
  indexStatements.push({ table, name, sql: `  ${unique ? "UNIQUE " : ""}KEY ${quote(name)} (${cols.join(", ")})` });
}
const statements = [
  "-- REVIEW-ONLY generated schema draft. Do not execute against production.",
  `-- Source snapshot: ${manifest.snapshot_date}; ${manifest.table_count} tables; ${manifest.metadata_counts?.columns || "?"} columns.`,
  "-- UUIDs use CHAR(36); all DATETIME values must be stored as UTC.",
  "SET FOREIGN_KEY_CHECKS = 0;",
];
for (const table of manifest.tables) {
  const tableName = table.name.split(".").at(-1);
  const columns = (table.columns || []).map((col) => {
    const type = mysqlType(tableName, col);
    const nullable = (col.options || []).includes("nullable");
    const defaultValue = normalizeDefault(col.default_value, col.format);
    let line = `  ${quote(col.name)} ${type}${nullable ? "" : " NOT NULL"}`;
    if (defaultValue !== null) line += ` DEFAULT ${defaultValue}`;
    return line;
  });
  if (table.primary_keys?.length) columns.push(`  PRIMARY KEY (${table.primary_keys.map(quote).join(", ")})`);
  for (const index of indexStatements.filter(x=>x.table===tableName)) columns.push(index.sql);
  for (const check of (manifest.check_constraints || []).filter((item) => item.table_name === tableName)) {
    const translated = translateCheck(check.check_clause);
    if (translated) columns.push(`  CONSTRAINT ${quote(check.constraint_name.slice(0,64))} CHECK (${translated})`);
    else warnings.push(`Untranslated CHECK ${tableName}.${check.constraint_name}: ${check.check_clause}`);
  }
  statements.push(`CREATE TABLE IF NOT EXISTS ${quote(tableName)} (\n${columns.join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
}

for (const fk of fkGroups.values()) {
  const first = fk[0];
  const localCols = fk.sort((a,b)=>a.ordinal_position-b.ordinal_position).map(x=>quote(x.column_name));
  const foreignCols = fk.map(x=>quote(x.foreign_column_name));
  const source = first.table_name;
  const target = first.foreign_table_name;
  const deleteRule = first.delete_rule === "CASCADE" ? "CASCADE" : first.delete_rule === "SET NULL" ? "SET NULL" : "RESTRICT";
  const updateRule = first.update_rule === "CASCADE" ? "CASCADE" : first.update_rule === "SET NULL" ? "SET NULL" : "RESTRICT";
  statements.push(`ALTER TABLE ${quote(source)} ADD CONSTRAINT ${quote(first.constraint_name.slice(0,64))} FOREIGN KEY (${localCols.join(", ")}) REFERENCES ${quote(target)} (${foreignCols.join(", ")}) ON DELETE ${deleteRule} ON UPDATE ${updateRule};`);
}
statements.push("SET FOREIGN_KEY_CHECKS = 1;");
statements.push("", "-- Portability warnings requiring manual translation/review.");
for (const warning of warnings) statements.push(`-- WARNING: ${warning.replace(/\n/g, " ")}`);
const output = statements.join("\n\n") + "\n";
if (outputPath) fs.writeFileSync(outputPath, output, "utf8");
else process.stdout.write(output);
process.stderr.write(`Generated ${manifest.table_count} CREATE TABLE statements; ${warnings.length} portability warnings; ${(manifest.check_constraints || []).length} CHECK constraints require review.\n`);
