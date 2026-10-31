import "server-only";

import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getApplicationMySqlPool } from "@/lib/data-access/mysql-pool";
import type { AnnouncementPayload, AnnouncementRepository } from "@/lib/data-access/announcements";

type DbRow = RowDataPacket & Record<string, unknown>;
type DbError = { code?: string; message: string };

function dbError(error: unknown): { message: string; code?: string } {
  const value = error as Partial<DbError>;
  return { message: value.message || "MySQL query failed.", code: value.code };
}

function sqlIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error("Unsafe SQL identifier.");
  return "`" + value + "`";
}

function sqlValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value) || (value !== null && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value))) {
    return JSON.stringify(value);
  }
  return value;
}

async function columnsFor(table: string): Promise<Set<string>> {
  const pool = getApplicationMySqlPool();
  const [rows] = await pool.execute<DbRow[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  return new Set(rows.map((row) => String(row.COLUMN_NAME)));
}

async function insertAnnouncement(payload: AnnouncementPayload): Promise<Record<string, unknown>> {
  const pool = getApplicationMySqlPool();
  const columns = await columnsFor("services_announcements");
  const row: Record<string, unknown> = { ...payload };
  if (columns.has("id")) row.id = randomUUID();
  const entries = Object.entries(row).filter(([key, value]) => value !== undefined && columns.has(key));
  if (!entries.length) throw new Error("No valid announcement columns were supplied.");
  const names = entries.map(([key]) => sqlIdentifier(key)).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  await pool.execute(
    `INSERT INTO services_announcements (${names}) VALUES (${placeholders})`,
    entries.map(([, value]) => sqlValue(value)),
  );
  if (row.id) {
    const [saved] = await pool.execute<DbRow[]>(
      "SELECT * FROM services_announcements WHERE id = ? LIMIT 1",
      [row.id],
    );
    if (saved[0]) return saved[0];
  }
  return row;
}

async function updateAnnouncement(id: string, payload: Partial<AnnouncementPayload> & { updated_at?: string }): Promise<Record<string, unknown> | null> {
  const pool = getApplicationMySqlPool();
  const columns = await columnsFor("services_announcements");
  const entries = Object.entries(payload).filter(([key, value]) => key !== "id" && value !== undefined && columns.has(key));
  if (!entries.length) {
    const [rows] = await pool.execute<DbRow[]>("SELECT * FROM services_announcements WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }
  const assignments = entries.map(([key]) => `${sqlIdentifier(key)} = ?`).join(", ");
  await pool.execute(
    `UPDATE services_announcements SET ${assignments} WHERE id = ?`,
    [...entries.map(([, value]) => sqlValue(value)), id],
  );
  const [rows] = await pool.execute<DbRow[]>("SELECT * FROM services_announcements WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

export function createMySqlAnnouncementRepository(): AnnouncementRepository {
  const pool = getApplicationMySqlPool();

  return {
    async listAdmin() {
      try {
        const [data] = await pool.query<DbRow[]>(
          "SELECT id,title,type,summary,start_at,end_at,extended_end_at,is_active,is_extendable,button_label,priority,created_at,service_id FROM services_announcements ORDER BY priority DESC, start_at DESC",
        );
        return { data, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },

    async listServices() {
      try {
        const [data] = await pool.query<DbRow[]>(
          "SELECT id,title,icon FROM services WHERE is_active = 1 ORDER BY title",
        );
        return { data, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },

    async findById(id) {
      try {
        const [rows] = await pool.execute<DbRow[]>(
          "SELECT * FROM services_announcements WHERE id = ? LIMIT 1",
          [id],
        );
        return { data: (rows[0] as Record<string, unknown> | undefined) || null, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },

    async create(payload) {
      try {
        return { data: await insertAnnouncement(payload), error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },

    async update(id, payload) {
      try {
        const data = await updateAnnouncement(id, {
          ...payload,
          updated_at: payload.updated_at || new Date().toISOString(),
        });
        return { data, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },

    async setActive(id, isActive) {
      try {
        const [result] = await pool.execute(
          "UPDATE services_announcements SET is_active = ?, updated_at = ? WHERE id = ?",
          [isActive ? 1 : 0, new Date().toISOString(), id],
        );
        void result;
        return { error: null };
      } catch (error) {
        return { error: dbError(error) };
      }
    },

    async remove(id) {
      try {
        await pool.execute("DELETE FROM services_announcements WHERE id = ?", [id]);
        return { error: null };
      } catch (error) {
        return { error: dbError(error) };
      }
    },

    async listPublic(mode = "window") {
      try {
        const [rows] = await pool.query<DbRow[]>(
          "SELECT a.id,a.title,a.summary,a.content,a.type,a.start_at,a.end_at,a.extended_end_at,a.button_label,a.service_id,a.priority,a.created_at,a.documents,a.is_extendable,a.is_active,s.title AS service_title,s.slug AS service_slug,s.category AS service_category,s.description AS service_description,s.icon AS service_icon,s.price AS service_price,s.form_schema AS service_form_schema FROM services_announcements a LEFT JOIN services s ON s.id = a.service_id WHERE a.is_active = 1 ORDER BY a.priority DESC,a.created_at DESC LIMIT 100",
        );
        const now = Date.now();
        const data = rows.map((row) => ({
          id: row.id,
          title: row.title,
          summary: row.summary,
          content: row.content,
          type: row.type,
          start_at: row.start_at,
          end_at: row.end_at,
          extended_end_at: row.extended_end_at,
          button_label: row.button_label,
          service_id: row.service_id,
          priority: row.priority,
          created_at: row.created_at,
          documents: typeof row.documents === "string" ? (() => { try { return JSON.parse(row.documents as string); } catch { return []; } })() : row.documents,
          is_extendable: row.is_extendable,
          is_active: row.is_active,
          services: row.service_title ? {
            title: row.service_title,
            slug: row.service_slug,
            category: row.service_category,
            description: row.service_description,
            icon: row.service_icon,
            price: row.service_price,
            form_schema: typeof row.service_form_schema === "string" ? (() => { try { return JSON.parse(row.service_form_schema as string); } catch { return null; } })() : row.service_form_schema,
          } : null,
        }));
        const visible = data.filter((item) => {
          if (mode === "all-active") return true;
          const start = item.start_at ? Date.parse(String(item.start_at)) : null;
          const endValue = item.extended_end_at || item.end_at;
          const end = endValue ? Date.parse(String(endValue)) : null;
          if (mode === "started") {
            return start !== null && !Number.isNaN(start) && start <= now &&
              end !== null && !Number.isNaN(end) && end > now;
          }
          return (start === null || (!Number.isNaN(start) && start <= now)) &&
            end !== null && !Number.isNaN(end) && end > now;
        });
        return { data: visible, error: null };
      } catch (error) {
        return { data: null, error: dbError(error) };
      }
    },
  };
}
