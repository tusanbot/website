import "server-only";

import mysql, { type Pool } from "mysql2/promise";
import { assertProviderConfigured } from "@/lib/data-access/database-runtime";

declare global {
  // eslint-disable-next-line no-var
  var __tusanApplicationMySqlPool: Pool | undefined;
}

export function getApplicationMySqlPool(): Pool {
  assertProviderConfigured("mysql");

  if (!globalThis.__tusanApplicationMySqlPool) {
    globalThis.__tusanApplicationMySqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: Math.max(1, Math.min(Number(process.env.MYSQL_POOL_SIZE || 5), 10)),
      queueLimit: 25,
      charset: "utf8mb4",
      supportBigNumbers: true,
      bigNumberStrings: true,
      decimalNumbers: false,
      dateStrings: true,
      connectTimeout: 8000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: process.env.MYSQL_SSL === "1" ? { rejectUnauthorized: true } : undefined,
    });
  }

  return globalThis.__tusanApplicationMySqlPool;
}

export async function checkApplicationMySqlConnection(): Promise<void> {
  await getApplicationMySqlPool().query("SELECT 1");
}
