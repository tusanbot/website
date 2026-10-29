# Dual-database migration: implementation contract

## Goal and current authority

The website will support Supabase/PostgreSQL and cPanel MariaDB at the same time. Initially, Supabase remains the authoritative writer and reader. MariaDB is a synchronized replica. A future controlled cutover may make MariaDB authoritative while continuing to synchronize changes back to Supabase.

This document describes the target contract; it does not mean dual-write or synchronization is already implemented.

## Runtime constraint

The repository uses Next.js 16 and `@opennextjs/cloudflare` and includes a Cloudflare build/deploy script. Cloudflare Workers do not provide a general raw TCP connection to a cPanel MySQL server. Do not add a browser-side MySQL connection or expose database credentials. Before enabling MariaDB access, determine the deployed runtime for each route. If a route executes on Cloudflare, access MariaDB through a narrowly scoped, authenticated HTTPS bridge hosted in a suitable Node.js environment; if it executes on cPanel Node.js, use a server-only MariaDB adapter. Keep these implementations behind one server-side interface.

## Non-negotiable safety rules

- Supabase Auth and user identity remain unchanged in the first phase.
- Never expose service-role keys, MySQL credentials, signing secrets, or database URLs to browser bundles.
- Do not change production MariaDB `tusancni_main` as part of development; use `tusancni_test` for validation.
- Do not run a bulk import or a cutover until counts, relationships, uniqueness, null handling, and retry behavior have been verified.
- Preserve primary IDs and foreign-key relationships across databases.
- Use explicit table/column allowlists; never expose a generic SQL execution endpoint.
- Do not rely on two sequential database writes as a transaction.

## Synchronization model

Use a durable outbox/queue and an idempotent consumer, not best-effort dual writes.

1. The authoritative database transaction writes the business row and an outbox event atomically.
2. A server-side worker claims pending events, applies the change to the other database, and marks the event delivered only after success.
3. Failed events retain their payload and error metadata and are retried with bounded backoff.
4. Each event has a stable event ID and each record retains its existing primary ID. The destination applies events idempotently.
5. Deletes must be represented explicitly (tombstone/delete event); they must not silently disappear from synchronization.
6. A reconciliation job compares row counts and selected hashes/updated_at values and reports drift.

For Supabase-primary mode, a PostgreSQL trigger/outbox or an equivalent transactional database-side mechanism is required to capture writes from existing browser clients as well as API routes. A queue written only by a subset of Next.js API routes is incomplete while clients continue writing directly to Supabase.

For MySQL-primary mode, use a MariaDB outbox written in the same transaction as the business update and a reverse consumer. Avoid two independent authoritative writers. Any temporary conflict must be resolved using an explicit version/authority policy, not wall-clock timestamps alone.

## Authority configuration

Introduce a server-only setting such as `DATA_PRIMARY=supabase|mysql`, defaulting to `supabase`. Fail closed on invalid values. The setting controls the authoritative read/write adapter; it does not by itself make a cutover safe. The reverse sync worker, reconciliation, and all write paths must be ready before switching it.

Suggested rollout:
1. Inventory all data paths and schema differences.
2. Add server-only adapter interfaces and safe configuration, without changing existing behavior.
3. Pilot one low-risk domain (blog posts and their service associations), with Supabase still authoritative.
4. Add durable outbox capture and retry/idempotency.
5. Verify mirror parity in `tusancni_test`.
6. Move additional domains in dependency order.
7. Run read-shadow comparisons.
8. Switch authority only during a controlled cutover with a verified rollback plan.

## Blog slug contract

- Normalize slugs to Unicode NFC and trim surrounding whitespace.
- Reject blank slugs and slugs longer than 191 Unicode code units before writes.
- Keep the database UNIQUE constraint as the final concurrency guard; application pre-checks improve the error message but do not replace the constraint.
- Treat a uniqueness conflict as HTTP 409.
- Do not silently truncate a slug: truncation can change URLs and create collisions.
- Apply the same validation regardless of the selected primary database.

## `news_sources.url` contract

Do not add a prefix-only unique index and assume it guarantees full URL uniqueness. First inventory every writer, decide whether uniqueness is based on exact URL or canonicalized URL, and inspect actual URL lengths. If a canonical URL hash is used as an indexable key, keep the full canonical URL and verify it on hash conflict.

## Initial code-path inventory

The following direct paths were confirmed during the initial repository review and must be included in the pilot or tracked as explicit follow-up work:

- `app/api/admin/blog/route.ts`: server-side create/update/delete of `blog_posts`; create/delete of `blog_post_services`; reads of posts, categories, services and service associations.
- `app/admin/blog/BlogAdmin.tsx`: browser UI that calls the blog admin API.
- `components/blog/BlogInteractions.tsx`: browser-side Supabase operations for blog views/engagement, comments, reactions and ratings, including RPC calls. These cannot be synchronized by changing only the admin blog API.
- `components/blog/BlogViewTracker.tsx`: browser-side view-recording RPC.
- `app/(main)/admin/announcements/new/page.tsx`: browser-side insert into `services_announcements`.
- `app/(main)/admin/announcements/[id]/page.tsx`: browser-side read/update of `services_announcements`.
- `app/(main)/admin/announcements/page.tsx`: browser-side read, active toggle and delete for `services_announcements`.
- `app/api/home/announcements/route.ts`: server-side read of announcements and services.
- `app/api/admin/blog/comments/route.ts`: server-side read/update/delete of `blog_comments`.
- `app/api/admin/blog/analytics/route.ts`: uses a Supabase RPC for analytics.
- `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/supabaseServer.ts`, and `lib/supabaseAdmin.ts`: existing client factories. They do not provide a MariaDB adapter.

This is an initial confirmed inventory, not a claim that every table writer in the repository has been found. GitHub code search is not indexed for this repository, and the writer for `news_sources.url` has not yet been identified. Continue searching by enumerating and reviewing all Supabase table/RPC mutations and external scheduled jobs before enabling synchronization.

## Required verification before expanding the pilot

- Existing rows are preserved and IDs match.
- Duplicate keys and orphans are zero or explicitly resolved.
- Create/update/delete events all mirror correctly.
- Retrying an event does not duplicate or revert data.
- Temporary destination outage does not lose events.
- Queue lag and failed events are observable.
- No client bundle contains database secrets.
- The current Cloudflare and cPanel execution paths are both accounted for.
