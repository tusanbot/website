/**
 * One-time, guarded copy of the public blog data from Supabase to MySQL.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *
 * Safety: refuses to run if ANY target table already contains rows.
 * Does not modify Supabase and does not change the site's normal blog routes.
 */
import { createClient } from "@supabase/supabase-js";
import mysql from "mysql2/promise";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const tables = [
  {
    name: "blog_categories",
    columns: ["id", "name", "slug", "description", "created_at"],
  },
  {
    name: "blog_posts",
    columns: [
      "id", "title", "slug", "excerpt", "content", "featured_image",
      "category_id", "meta_title", "meta_description", "status",
      "published_at", "author_id", "created_at", "updated_at",
      "primary_keyword", "seo_keywords",
    ],
  },
  { name: "blog_post_services", columns: ["post_id", "service_id"] },
  {
    name: "blog_reactions",
    columns: ["id", "post_id", "user_id", "reaction", "created_at", "updated_at"],
  },
  {
    name: "blog_ratings",
    columns: ["id", "post_id", "user_id", "rating", "created_at", "updated_at"],
  },
  {
    name: "blog_comments",
    columns: [
      "id", "post_id", "user_id", "content", "status",
      "created_at", "updated_at", "author_name",
    ],
  },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const mysqlConnection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: "utf8mb4",
  timezone: "Z",
  multipleStatements: false,
});

function normalizeValue(column, value) {
  if (value === null || value === undefined) return null;
  if (column === "seo_keywords") return JSON.stringify(value);
  if (
    ["created_at", "updated_at", "published_at"].includes(column) &&
    typeof value === "string"
  ) {
    // Convert ISO-8601 timestamps to UTC MySQL DATETIME(3) text.
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp in ${column}`);
    return date.toISOString().slice(0, 23).replace("T", " ");
  }
  return value;
}

async function readAllFromSupabase(table) {
  const all = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Supabase read failed for ${table}: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

try {
  const [targetRows] = await mysqlConnection.query(
    `SELECT ${tables.map((t) => `(SELECT COUNT(*) FROM \`${t.name}\`) AS \`${t.name}\``).join(", ")}`,
  );
  const occupied = Object.entries(targetRows[0]).filter(([, count]) => Number(count) !== 0);
  if (occupied.length) {
    throw new Error(
      `Safety stop: target tables are not empty (${occupied.map(([name, count]) => `${name}=${count}`).join(", ")}). No rows were copied.`,
    );
  }

  const snapshot = new Map();
  for (const table of tables) {
    const rows = await readAllFromSupabase(table.name);
    snapshot.set(table.name, rows);
    console.log(`Read ${rows.length} rows from Supabase ${table.name}`);
  }

  await mysqlConnection.beginTransaction();
  try {
    for (const table of tables) {
      const rows = snapshot.get(table.name);
      if (!rows.length) continue;
      const columns = table.columns;
      const placeholders = `(${columns.map(() => "?").join(", ")})`;
      const sql = `INSERT INTO \`${table.name}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES ${rows.map(() => placeholders).join(", ")}`;
      const values = rows.flatMap((row) =>
        columns.map((column) => normalizeValue(column, row[column])),
      );
      await mysqlConnection.query(sql, values);
      console.log(`Copied ${rows.length} rows into MySQL ${table.name}`);
    }
    await mysqlConnection.commit();
  } catch (error) {
    await mysqlConnection.rollback();
    throw error;
  }

  console.log("\nMigration copy finished. Verify row counts before enabling any pilot reads.");
  for (const table of tables) {
    const sourceCount = snapshot.get(table.name).length;
    const [rows] = await mysqlConnection.query(`SELECT COUNT(*) AS count FROM \`${table.name}\``);
    const targetCount = Number(rows[0].count);
    console.log(`${table.name}: Supabase=${sourceCount}, MySQL=${targetCount}`);
    if (sourceCount !== targetCount) {
      throw new Error(`Row count mismatch in ${table.name}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
} finally {
  await mysqlConnection.end();
}
