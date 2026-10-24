# Supabase → MySQL Migration Runbook

**Status:** preparation only; no production database or application routes changed.  
**Required base branch:** `cloudflare-migration`  
**Preparation branch:** `cloudflare-migration-mysql-prep`

## Safety rules

1. Supabase remains the authoritative production database until a separately approved cutover.
2. Do not run schema DDL or data-copy scripts against a production MySQL database.
3. Use a newly created, isolated MySQL database for the pilot. Before creating tables, verify the database is empty and belongs to the test environment.
4. Never expose database credentials, Supabase service-role credentials, or connection errors in browser responses.
5. Keep Supabase Auth and Storage in place during the blog pilot. Do not migrate auth credentials or make private files public.
6. Do not merge this preparation branch or deploy it to production before review and validation.

## Why this is a staged migration

The current application uses Supabase for more than blog content: authentication, storage, services, registrations, orders, payments, discounts, support, notifications, and other features. A complete replacement requires porting PostgreSQL constraints, RLS policies, functions, triggers, and authorization behavior; copying rows alone is not sufficient.

The initial pilot should be limited to these six blog tables:

- `blog_categories`
- `blog_posts`
- `blog_post_services`
- `blog_comments`
- `blog_ratings`
- `blog_reactions`

This list is a proposed pilot scope, not proof that the target schema or source data has been validated. Any source/target row totals previously recorded must be re-measured before acceptance.

## Current blockers before implementation

- The deployment branch does not currently declare `mysql2` in its `package.json`.
- The deployment branch does not have a tracked `package-lock.json` at the expected path. Do not copy a lockfile from another branch without reconciling it against this branch's full dependency graph.
- The existing experimental `/mysql-test` page only sets `noindex`; that does **not** restrict access. Do not deploy that page publicly until a real server-side access gate is implemented and tested.
- The existing one-time copy script verifies that target tables are empty and compares row counts, but row-count equality alone does not establish data equivalence. Acceptance also needs primary-key-set checks, normalized row hashes, relationship/orphan checks, and explicit failure handling.
- The existing schema uses `CREATE TABLE IF NOT EXISTS`; that does not prove an existing target table has the expected definition. Validate the target schema before any import.

## Required sequence

### Phase A — Read-only inventory

- Inventory all Supabase usage in the active `cloudflare-migration` branch: direct table queries, RPC calls, Auth, Storage, Realtime, and server/client access boundaries.
- Export schema metadata separately from row data: columns and types, nullability/defaults, primary/foreign keys, indexes, checks, RLS policies, functions, triggers, views, bucket privacy, and storage policies.
- Capture exact row counts at a recorded point in time. Do not treat catalog estimates as exact counts.

### Phase B — Isolated target preparation

- Create a separate test database and least-privilege MySQL account.
- Confirm the target database is empty and is not used by the live website.
- Reconcile the MySQL schema with the source schema, including unique indexes, text lengths, Unicode, timestamps, JSON values, and foreign-key behavior.
- Add `mysql2` to the active branch's manifest and generate a matching lockfile in a compatible build environment. Do not hand-edit or reuse a mismatched lockfile.

### Phase C — Repeatable transfer and verification

- Read from Supabase without modifying it.
- Import into the isolated target in dependency order, within a transaction where feasible.
- Abort if the target is occupied or its schema is unexpected; never truncate or overwrite existing target data.
- Verify per-table exact counts, primary-key sets, normalized row hashes, foreign-key orphans, and selected business-critical values.
- Record the source snapshot time and re-run a delta comparison before any eventual cutover.

### Phase D — Protected pilot

- Use a separate test deployment/subdomain, separate environment variables, and a server-side authentication or equivalent access gate.
- Keep the regular blog routes on Supabase during the pilot.
- Test Persian/Unicode content, slugs, ordering, category/service relations, comments, ratings, reactions, empty/error states, and access controls.
- Do not expose raw SQL errors or environment configuration to clients.

### Phase E — Acceptance and cutover

- Obtain explicit approval after all checks pass.
- Back up the production database and site before changing traffic.
- Use a controlled write freeze or delta-sync for a consistent final snapshot.
- Keep a tested rollback path. Do not disable Supabase until dependent flows and rollback are verified.

## Current status

This branch adds documentation only. It does not add a MySQL driver, change the dependency graph, create tables, copy production rows, alter routes, or change production database ownership. The next safe implementation step is to reconcile the active branch's package manifest and lockfile strategy, then implement the protected test route and read-only target-schema validation.
