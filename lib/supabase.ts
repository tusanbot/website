import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (client) return client;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required to initialize Supabase."
        );
    }

    client = createBrowserClient(supabaseUrl, supabaseKey);
    return client;
}

/**
 * Lazily initialized browser Supabase client.
 *
 * Keeping initialization out of module evaluation is important for Next.js
 * server/build phases: API routes may import this module while environment
 * variables are not available during build-time route analysis.
 */
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, property, receiver) {
        return Reflect.get(getSupabaseClient() as object, property, receiver);
    },
    set(_target, property, value, receiver) {
        return Reflect.set(getSupabaseClient() as object, property, value, receiver);
    },
});