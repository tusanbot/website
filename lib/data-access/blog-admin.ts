import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RepositoryError = {
  code?: string;
  message: string;
} | null;

export type RepositoryResult<T> = {
  data: T | null;
  error: RepositoryError;
  count?: number | null;
};

export interface BlogAdminRepository {
  listAdminData(): Promise<{
    posts: unknown[];
    categories: unknown[];
    services: unknown[];
    error: string | null;
  }>;
  findDuplicateSlug(slug: string, exceptId?: string): Promise<RepositoryResult<{ id: string }>>;
  insertPost(payload: Record<string, unknown>): Promise<RepositoryResult<Record<string, unknown>>>;
  insertPostServices(rows: Array<{ post_id: string; service_id: string }>): Promise<RepositoryResult<unknown>>;
  updatePost(id: string, payload: Record<string, unknown>): Promise<RepositoryResult<Record<string, unknown>>>;
  deletePostServices(postId: string): Promise<RepositoryResult<unknown>>;
  deletePost(id: string): Promise<RepositoryResult<unknown>>;
  listComments(status: string, search: string): Promise<RepositoryResult<unknown[]>>;
  countPendingComments(): Promise<RepositoryResult<unknown>>;
  updateComment(id: string, status: string, updatedAt: string): Promise<RepositoryResult<Record<string, unknown>>>;
  deleteComment(id: string): Promise<RepositoryResult<unknown>>;
}

/**
 * Domain-level data access boundary for the first blog pilot.
 * Supabase is deliberately the only implementation/authority at this stage.
 * A MariaDB implementation can be added behind this contract after its read
 * API, transaction semantics, and schema mapping are proven.
 */
export function createBlogAdminRepository(): BlogAdminRepository {
  const db = supabaseAdmin();

  return {
    async listAdminData() {
      const [postsRes, categoriesRes, servicesRes] = await Promise.all([
        db.from("blog_posts").select("*,blog_categories(name),blog_post_services(service_id,services(id,title,slug))").order("created_at", { ascending: false }),
        db.from("blog_categories").select("id,name,slug").order("name"),
        db.from("services").select("id,title,slug").eq("is_active", true).order("title"),
      ]);

      return {
        posts: postsRes.data || [],
        categories: categoriesRes.data || [],
        services: servicesRes.data || [],
        error: postsRes.error?.message || categoriesRes.error?.message || servicesRes.error?.message || null,
      };
    },

    async findDuplicateSlug(slug, exceptId) {
      let query = db.from("blog_posts").select("id").eq("slug", slug);
      if (exceptId) query = query.neq("id", exceptId);
      return await query.maybeSingle() as RepositoryResult<{ id: string }>;
    },

    async insertPost(payload) {
      return await db.from("blog_posts").insert(payload).select().single() as RepositoryResult<Record<string, unknown>>;
    },

    async insertPostServices(rows) {
      return await db.from("blog_post_services").insert(rows) as RepositoryResult<unknown>;
    },

    async updatePost(id, payload) {
      return await db.from("blog_posts").update(payload).eq("id", id).select().single() as RepositoryResult<Record<string, unknown>>;
    },

    async deletePostServices(postId) {
      return await db.from("blog_post_services").delete().eq("post_id", postId) as RepositoryResult<unknown>;
    },

    async deletePost(id) {
      return await db.from("blog_posts").delete().eq("id", id) as RepositoryResult<unknown>;
    },

    async listComments(status, search) {
      let query = db.from("blog_comments")
        .select("id,post_id,user_id,content,status,created_at,updated_at,author_name,blog_posts!inner(id,title,slug)")
        .order("created_at", { ascending: false });
      if (["pending", "approved", "rejected"].includes(status)) query = query.eq("status", status);
      if (search) query = query.or("content.ilike.%" + search + "%,author_name.ilike.%" + search + "%");
      return await query.limit(200) as RepositoryResult<unknown[]>;
    },

    async countPendingComments() {
      return await db.from("blog_comments").select("id", { count: "exact", head: true }).eq("status", "pending") as RepositoryResult<unknown>;
    },

    async updateComment(id, status, updatedAt) {
      return await db.from("blog_comments").update({ status, updated_at: updatedAt }).eq("id", id).select("id,status,updated_at").single() as RepositoryResult<Record<string, unknown>>;
    },

    async deleteComment(id) {
      return await db.from("blog_comments").delete().eq("id", id) as RepositoryResult<unknown>;
    },
  };
}
