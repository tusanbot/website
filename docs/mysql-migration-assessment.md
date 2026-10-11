# Full-site Supabase → MySQL migration assessment

**Status:** discovery only; no production changes made.  
**Repository:** `tusanbot/website`  
**Working branch:** `migration/blog-mysql-pilot`  
**Supabase project:** `yhbaedfifcxgjxutnyjc`  
**Assessment date:** 2026-10-11

## Executive summary

The current MySQL pilot is a **blog-only pilot**, not a full-site migration. Its six blog tables contain 154 rows according to the previously verified source/target counts. The test route reads from MySQL, while ordinary site routes still use Supabase.

The live Supabase project has a much larger surface area. A read-only catalog inspection found:

- 60 tables in the `public` schema, all with RLS enabled.
- 1 public view.
- 89 public functions/routines and 40 trigger event entries.
- 267 recorded Supabase migrations.
- 15 Supabase Auth users.
- Three Storage buckets with 157 objects in total: `blog-images` (137 public objects), `order-files` (13 private objects), and `payment-receipts` (7 private objects).
- Six tables currently reported by the Security Advisor as having RLS enabled but no policies. The advisor also reports functions callable as SECURITY DEFINER by `anon` and/or `authenticated`; these need review before any replacement access layer is released.

Catalog row estimates are statistics, not authoritative exact counts. Recalculate exact row counts and compare every table at migration time.

## Current table inventory (public schema)

### Blog
- `blog_categories`
- `blog_posts`
- `blog_post_services`
- `blog_comments`
- `blog_ratings`
- `blog_reactions`

### Accounts, settings, notifications, and AI
- `profiles`
- `notifications`
- `site_settings`
- `messages`
- `ai_profiles`
- `ai_sessions`
- `api_rate_limits`
- `financial_transactions`
- `traxtor_saved_projects`

### Services, forms, goals, and registrations
- `services`
- `services_announcements`
- `custom_forms`
- `form_versions`
- `goals`
- `sub_goals`
- `registrations`

### Orders, payments, discounts, and staff finance
- `orders`
- `payments`
- `order_files`
- `order_history`
- `order_cancellation_requests`
- `order_refunds`
- `order_staff_requests`
- `order_commission_ledger`
- `discounts`
- `discount_codes`
- `discount_services`
- `discount_tag_rules`
- `discount_usages`
- `payout_requests`
- `staff_bank_accounts`
- `staff_category_access`
- `staff_earnings`
- `staff_financial_adjustments`
- `staff_reviews`
- `staff_role_assignments`
- `staff_roles`
- `staff_service_access`
- `staff_settlements`
- `member_tags`
- `member_tag_assignments`
- `tag_referral_links`

### Support
- `support_conversations`
- `support_conversation_participants`
- `support_messages`
- `support_faqs`
- `support_reviews`

### Social catalog/orders
- `social_categories`
- `social_orders`
- `social_platforms`
- `social_services`
- `social_sync_logs`

### News
- `news_announcements`
- `news_sources`

The public view is `social_services_public`. Supabase-managed schemas such as `auth` and `storage` must be assessed separately; they are not included in the 60-table public count.

## Migration constraints

1. **Auth is not just a table copy.** The current application uses Supabase Auth/SSR. Moving identity to MySQL requires a deliberate replacement for password verification, sessions/cookies, email/phone flows, password reset, authorization, and existing user IDs. Do not drop Supabase Auth until those flows have end-to-end tests and a rollback plan.
2. **Storage is part of the application.** Copying rows alone will not move 157 Storage objects or preserve private-file authorization. The private `order-files` and `payment-receipts` buckets must not become publicly readable.
3. **Postgres behavior must be ported, not blindly translated.** RLS policies, 89 routines, 40 trigger event entries, UUID generation, JSONB/arrays, timestamps, and transaction semantics affect application behavior. Convert business rules into explicit server-side authorization/services and MySQL constraints/triggers only where appropriate.
4. **Payments need special handling.** Keep payment provider callbacks/idempotency and order/payment state transitions under test; never replay production payment events during data migration.
5. **The cPanel environment is constrained.** The pilot build succeeds only after limiting Next.js build CPUs. The host's GLIBC prevents loading the native SWC binary, so WASM fallback remains a deployment risk to monitor.
6. **Dependency security is a release gate.** The current pilot pins Next.js 16.3.3, which was flagged for security review in the migration work. Confirm a patched compatible version and update lockfile before any public release.

## Proposed execution phases

### Phase 0 — Freeze and inventory (read-only)
- Keep the production site and Supabase authoritative.
- Inventory all code paths that use Supabase clients, direct `.from()` queries, `.rpc()`, Auth, Realtime, and Storage.
- Export table definitions, indexes, foreign keys, checks, policies, routines, triggers, view definitions, Storage policies/bucket metadata, and Auth configuration.
- Record exact per-table row counts and object counts. Do not copy more production data until the mapping is reviewed.

### Phase 1 — Target schema and compatibility layer
- Define MySQL/InnoDB schema for all application-owned tables with explicit types, constraints, indexes, and foreign keys.
- Preserve UUIDs and all references where feasible; preserve timestamps and Persian/Unicode data using `utf8mb4`.
- Implement server-only database access and an authorization layer equivalent to the current intended RLS behavior.
- Decide explicitly whether Supabase Auth and Storage remain external temporarily or are replaced in the first migration. No implicit mixed ownership.

### Phase 2 — Repeatable data transfer
- Use an idempotent, checkpointed, read-only-source migration process.
- Respect foreign-key dependency order and handle updates/deletes between snapshots.
- Migrate data into an isolated MySQL database only; never truncate or overwrite an occupied target.
- Compare exact counts, primary-key sets, normalized row hashes, foreign-key orphans, and selected sensitive/business-critical fields.

### Phase 3 — Isolated cPanel application
- Use a separate cPanel Node.js application and a test subdomain, not the production application entrypoint.
- Keep the test route protected (authentication or IP/password gate), use separate environment variables, and prevent indexing.
- Route one feature at a time through MySQL and test read/write behavior, permissions, files, and workflows.

### Phase 4 — Acceptance and cutover
- Run regression tests for public pages, Persian slugs/SEO, authentication, profile, admin/staff roles, services/forms, orders/payments/refunds, discounts, support, notifications, news, social catalog, and file access.
- Plan a brief write freeze or delta-sync so the final source snapshot is consistent.
- Back up the current site/database, switch traffic only after explicit approval, and keep a tested rollback path.
- Do not merge this pilot PR or change production routing until all acceptance checks pass.

## Immediate next task

Complete a source-code dependency inventory and export the full schema metadata. Then prepare a table-by-table migration matrix with: source object, target object, row count, key/relationship mapping, read/write code locations, security model, and test cases. No schema changes or data writes to the production Supabase project are required for this discovery step.
