import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertProviderConfigured, getDomainDataRuntime } from "@/lib/data-access/database-runtime";
import { createMySqlAnnouncementRepository } from "@/lib/data-access/announcements-mysql";

export type AnnouncementPayload = {
  title: string;
  type: "registration" | "announcement";
  summary?: string | null;
  content?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  documents?: string[];
  is_active?: boolean;
  is_extendable?: boolean;
  extended_end_at?: string | null;
  button_label?: string | null;
  service_id?: string | null;
  priority?: number;
};

export interface AnnouncementRepository {
  listAdmin(): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  listServices(): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  findById(id: string): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  create(payload: AnnouncementPayload): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }>;
  update(id: string, payload: Partial<AnnouncementPayload> & { updated_at?: string }): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }>;
  setActive(id: string, isActive: boolean): Promise<{ error: { message: string } | null }>;
  remove(id: string): Promise<{ error: { message: string } | null }>;
  listPublic(mode?: "window" | "all-active" | "started"): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
}

/** Supabase remains the sole implementation until the MariaDB read/write adapter is proven. */
export function createAnnouncementRepository(): AnnouncementRepository {
  const runtime = getDomainDataRuntime("announcements");
  assertProviderConfigured(runtime.primary);
  if (runtime.primary === "mysql") return createMySqlAnnouncementRepository();

  const db = supabaseAdmin();

  return {
    async listAdmin() {
      return await db.from("services_announcements")
        .select("id,title,type,summary,start_at,end_at,extended_end_at,is_active,is_extendable,button_label,priority,created_at,service_id")
        .order("priority", { ascending: false })
        .order("start_at", { ascending: false });
    },

    async listServices() {
      return await db.from("services").select("id,title,icon").eq("is_active", true).order("title");
    },

    async findById(id) {
      return await db.from("services_announcements").select("*").eq("id", id).maybeSingle();
    },

    async create(payload) {
      return await db.from("services_announcements").insert(payload).select("*").single();
    },

    async update(id, payload) {
      return await db.from("services_announcements").update({ ...payload, updated_at: payload.updated_at || new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
    },

    async setActive(id, isActive) {
      const { error } = await db.from("services_announcements").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
      return { error };
    },

    async remove(id) {
      const { error } = await db.from("services_announcements").delete().eq("id", id);
      return { error };
    },

    async listPublic(mode = "window") {
      const now = Date.now();
      const { data, error } = await db.from("services_announcements")
        .select("id,title,summary,content,type,start_at,end_at,extended_end_at,button_label,service_id,priority,created_at,documents,is_extendable,is_active,services(title,slug,category,description,icon,price,form_schema)")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return { data: null, error };

      const visible = (data || []).filter((item) => {
        if (mode === "all-active") return true;
        const start = item.start_at ? Date.parse(item.start_at) : null;
        const endValue = item.extended_end_at || item.end_at;
        const end = endValue ? Date.parse(endValue) : null;
        if (mode === "started") {
          return start !== null && !Number.isNaN(start) && start <= now &&
            end !== null && !Number.isNaN(end) && end > now;
        }
        return (start === null || (!Number.isNaN(start) && start <= now)) &&
          end !== null && !Number.isNaN(end) && end > now;
      });
      return { data: visible, error: null };
    },
  };
}
