# Supabase usage inventory — active deployment branch

**Repository:** `tusanbot/website`  
**Deployment/base branch:** `cloudflare-migration`  
**Preparation branch:** `cloudflare-migration-mysql-prep`  
**Status:** source review in progress; no production data or routing changed.

## Confirmed from source inspection

- Browser-side Supabase access is centralized through `lib/supabase.ts`, which lazily creates a browser client using `@supabase/ssr` and the public URL/anon key.
- Server-side Supabase access is centralized through `lib/supabase/server.ts`, using request cookies and `createServerClient`.
- `proxy.ts` uses Supabase claims and the `profiles` role to gate `/admin` routes. Its early return means this proxy does not provide access control for arbitrary non-admin paths; a MySQL pilot route must implement its own server-side gate or be isolated behind another access-control layer.
- `package.json` on `cloudflare-migration` includes `@supabase/supabase-js` and `@supabase/ssr`, but does not declare `mysql2`.
- `package-lock.json` is not present at the repository root on `cloudflare-migration`. A lockfile copied from another branch would not be presumed compatible.
- The experimental route found on the separate pilot branch has `robots: noindex`, but no server-side authentication check in the route itself. Noindex is a crawler instruction, not an access-control mechanism; do not port that route into a public deployment as-is.

## Read-only audit script

Run `node scripts/audit-supabase-usage.mjs` from the repository root to produce a heuristic map of source files and line numbers that mention Supabase operations. The script deliberately prints paths, line numbers, and category counts only; it does not print source lines or environment values.

The scan is a triage aid, not a complete static analysis. It may include comments/strings and miss indirect wrappers or dynamically constructed table names. Review each hit in context before treating it as a real dependency.

## Next source-review tasks

1. Run the audit on the exact `cloudflare-migration` checkout and retain its output as a private working artifact; review all direct `.from()`, `.rpc()`, Auth, Storage, Realtime, and Edge Function calls.
2. Group the call sites by feature and distinguish browser-side access from server-side/service-role access.
3. Map each operation to the intended authorization rule and existing RLS policy before designing a MySQL replacement.
4. Resolve the dependency-install strategy on the active branch. Add `mysql2` only with a matching lockfile generated and checked in a compatible environment.
5. Implement a protected test surface separately from the production route tree, then test that unauthenticated requests cannot read it.

## Non-goals for this stage

- No production database connection or row reads.
- No writes to Supabase or MySQL.
- No migration of Auth or Storage.
- No route switch, public test route, or production deployment.
