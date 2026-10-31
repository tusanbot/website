import "server-only";

import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getApplicationMySqlPool } from "@/lib/data-access/mysql-pool";
import type { BlogAdminRepository, RepositoryResult } from "@/lib/data-access/blog-admin";

type DbRow = RowDataPacket & Record<string, unknown>;
type DbError = { code?: string; message: string };

function failure<T>(error: unknown): RepositoryResult<T> {
  const value = error as Partial<DbError>;
  return { data: null, error: { code: value.code, message: value.message || "MySQL query failed." } };
}

function serializeValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value) || (value !== null && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value))) {
    return JSON.stringify(value);
  }
  return value;
}

function identifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error("Unsafe SQL identifier.");
  return "`" + value + "`";
}

async function tableColumns(table: string): Promise<Set<string>> {
  const pool = getApplicationMySqlPool();
  const [rows] = await pool.execute<DbRow[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [table],
  );
  return new Set(rows.map((row) => String(row.COLUMN_NAME)));
}

async function insertRow(table: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const pool = getApplicationMySqlPool();
  const columns = await tableColumns(table);
  const row = { ...payload };
  if (columns.has("id") && row.id === undefined) row.id = randomUUID();
  const entries = Object.entries(row).filter(([key, value]) => value !== undefined && columns.has(key));
  if (!entries.length) throw new Error("No valid columns were supplied.");
  const names = entries.map(([key]) => identifier(key)).join(", ");
  const placeholders = entries.map(() => "?").join(", ");
  const values = entries.map(([, value]) => serializeValue(value));
  await pool.execute(`INSERT INTO ${identifier(table)} (${names}) VALUES (${placeholders})`, values);
  const id = row.id;
  if (id !== undefined) {
    const [saved] = await pool.execute<DbRow[]>(`SELECT * FROM ${identifier(table)} WHERE id = ? LIMIT 1`, [id]);
    if (saved[0]) return saved[0];
  }
  return row;
}

async function updateRow(table: string, id: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const pool = getApplicationMySqlPool();
  const columns = await tableColumns(table);
  const entries = Object.entries(payload).filter(([key, value]) => key !== "id" && value !== undefined && columns.has(key));
  if (!entries.length) {
    const [rows] = await pool.execute<DbRow[]>(`SELECT * FROM ${identifier(table)} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }
  const assignments = entries.map(([key]) => `${identifier(key)} = ?`).join(", ");
  await pool.execute(`UPDATE ${identifier(table)} SET ${assignments} WHERE id = ?`, [
    ...entries.map(([, value]) => serializeValue(value)),
    id,
  ]);
  const [rows] = await pool.execute<DbRow[]>(`SELECT * FROM ${identifier(table)} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

export function createMySqlBlogAdminRepository(): BlogAdminRepository {
  const pool = getApplicationMySqlPool();

  return {
    async listAdminData() {
      try {
        const [posts, categories, services, associations] = await Promise.all([
          pool.query<DbRow[]>("SELECT * FROM blog_posts ORDER BY created_at DESC"),
          pool.query<DbRow[]>("SELECT id, name, slug FROM blog_categories ORDER BY name"),
          pool.query<DbRow[]>("SELECT id, title, slug FROM services WHERE is_active = 1 ORDER BY title"),
          pool.query<DbRow[]>(
            "SELECT bps.post_id, bps.service_id, s.id AS joined_service_id, s.title AS service_title, s.slug AS service_slug FROM blog_post_services bps LEFT JOIN services s ON s.id = bps.service_id",
          ),
        ]);
        const postRows = posts[0];
        const categoryRows = categories[0];
        const serviceRows = services[0];
        const associationRows = associations[0];
        const categoryById = new Map(categoryRows.map((row) => [String(row.id), { name: row.name }]));
        const servicesByPost = new Map<string, unknown[]>();
        for (const row of associationRows) {
          const key = String(row.post_id);
          const values = servicesByPost.get(key) || [];
          values.push({
            service_id: row.service_id,
            services: row.joined_service_id
              ? { id: row.joined_service_id, title: row.service_title, slug: row.service_slug }
              : null,
          });
          servicesByPost.set(key, values);
        }
        return {
          posts: postRows.map((post) => ({
            ...post,
            blog_categories: post.category_id ? categoryById.get(String(post.category_id)) || null : null,
            blog_post_services: servicesByPost.get(String(post.id)) || [],
          })),
          categories: categoryRows,
          services: serviceRows,
          error: null,
        };
      } catch (error) {
        const value = error as Partial<DbError>;
        return { posts: [], categories: [], services: [], error: value.message || "MySQL query failed." };
      }
    },

    async findDuplicateSlug(slug, exceptId) {
      try {
        const [rows] = await pool.execute<DbRow[]>(
          `SELECT id FROM blog_posts WHERE slug = ? ${exceptId ? "AND id <> ?" : ""} LIMIT 1`,
          exceptId ? [slug, exceptId] : [slug],
        );
        return { data: (rows[0] as { id: string } | undefined) || null, error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async insertPost(payload) {
      try {
        return { data: await insertRow("blog_posts", payload), error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async insertPostServices(rows) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const row of rows) {
          await connection.execute(
            "INSERT INTO blog_post_services (post_id, service_id) VALUES (?, ?)",
            [row.post_id, row.service_id],
          );
        }
        await connection.commit();
        return { data: null, error: null };
      } catch (error) {
        await connection.rollback();
        return failure(error);
      } finally {
        connection.release();
      }
    },

    async updatePost(id, payload) {
      try {
        const data = await updateRow("blog_posts", id, payload);
        return { data, error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async deletePostServices(postId) {
      try {
        await pool.execute("DELETE FROM blog_post_services WHERE post_id = ?", [postId]);
        return { data: null, error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async deletePost(id) {
      try {
        await pool.execute("DELETE FROM blog_posts WHERE id = ?", [id]);
        return { data: null, error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async listComments(status, search) {
      try {
        const where: string[] = [];
        const values: unknown[] = [];
        if (["pending", "approved", "rejected"].includes(status)) {
          where.push("bc.status = ?");
          values.push(status);
        }
        if (search) {
          where.push("(bc.content LIKE ? OR bc.author_name LIKE ?)");
          const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
          values.push(term, term);
        }
        const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
        const [rows] = await pool.execute<DbRow[]>(
          `SELECT bc.id, bc.post_id, bc.user_id, bc.content, bc.status, bc.created_at, bc.updated_at, bc.author_name, bp.id AS joined_post_id, bp.title AS post_title, bp.slug AS post_slug FROM blog_comments bc INNER JOIN blog_posts bp ON bp.id = bc.post_id ${clause} ORDER BY bc.created_at DESC LIMIT 200`,
          values,
        );
        return {
          data: rows.map((row) => ({
            id: row.id,
            post_id: row.post_id,
            user_id: row.user_id,
            content: row.content,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            author_name: row.author_name,
            blog_posts: { id: row.joined_post_id, title: row.post_title, slug: row.post_slug },
          })),
          error: null,
        };
      } catch (error) {
        return failure(error);
      }
    },

    async countPendingComments() {
      try {
        const [rows] = await pool.query<DbRow[]>("SELECT COUNT(*) AS total FROM blog_comments WHERE status = 'pending'");
        return { data: null, error: null, count: Number(rows[0]?.total || 0) };
      } catch (error) {
        return failure(error);
      }
    },

    async updateComment(id, status, updatedAt) {
      try {
        const [result] = await pool.execute<ResultSetHeader>(
          "UPDATE blog_comments SET status = ?, updated_at = ? WHERE id = ?",
          [status, updatedAt, id],
        );
        if (result.affectedRows === 0) return { data: null, error: { message: "Comment not found." } };
        const [rows] = await pool.execute<DbRow[]>(
          "SELECT id, status, updated_at FROM blog_comments WHERE id = ? LIMIT 1",
          [id],
        );
        return { data: (rows[0] as Record<string, unknown> | undefined) || null, error: null };
      } catch (error) {
        return failure(error);
      }
    },

    async deleteComment(id) {
      try {
        await pool.execute("DELETE FROM blog_comments WHERE id = ?", [id]);
        return { data: null, error: null };
      } catch (error) {
        return failure(error);
      }
    },
  };
}
