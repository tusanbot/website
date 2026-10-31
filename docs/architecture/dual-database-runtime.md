# Tusan dual-database runtime

## Objective

The application data layer can run with Supabase only, MySQL only, or both providers available at the same time. This is an application-level capability, not merely two connection strings. Authentication is currently a separate concern and still uses Supabase Auth, including profile/role checks; selecting MySQL for application data does not remove that identity dependency.

## Modes

- TUSAN_DATA_MODE=supabase: Supabase is the only active application provider.
- TUSAN_DATA_MODE=mysql: reserved for the future full migration; currently rejected at runtime because several domains and authentication still depend on Supabase.
- TUSAN_DATA_MODE=dual: both providers are available. Domains can be routed independently to either provider, while each individual domain still has exactly one authoritative writer. Dual mode does not automatically replicate records or perform two writes.

The default remains supabase to preserve existing production behavior. Do not set mysql mode yet. In dual mode, the two current adapter pilots (blog administration and announcements) can be routed independently; the public blog and all other uncovered domains continue using their existing Supabase paths.

## Routing

TUSAN_DATA_PRIMARY=supabase|mysql selects the default authority in dual mode. Domain overrides are supported for the first repository pilots:

- TUSAN_DATA_PROVIDER_BLOG_ADMIN=supabase|mysql
- TUSAN_DATA_PROVIDER_ANNOUNCEMENTS=supabase|mysql

A domain override chooses that domain's provider. For example, blog administration can use MySQL while announcements continue using Supabase. A domain must never perform two independent writes and assume they form one transaction.

## Required environment

Supabase:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

MySQL:
- MYSQL_HOST
- MYSQL_PORT (optional; defaults to 3306)
- MYSQL_DATABASE
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_SSL=1 when TLS is configured
- MYSQL_POOL_SIZE (optional; bounded to 1–10)

Production safety:
- MYSQL_DATABASE=tusancni_main is rejected unless MYSQL_ALLOW_PRODUCTION=1 is explicitly set.
- Never expose MySQL credentials or service-role keys to client components or NEXT_PUBLIC_* variables.

Dual synchronization:
- TUSAN_DATA_MODE=dual
- TUSAN_DATA_PRIMARY=supabase|mysql
- Replication is configured separately from provider routing. The existing outbox pilot currently covers only Supabase-to-MySQL for seven tables; reverse replication and full-domain coverage are not complete.

## Consistency contract

1. A domain has one writer of record at a time.
2. The authoritative row mutation and outbox event are committed in the same database transaction.
3. Delivery is at-least-once; consumers are idempotent and enforce per-record ordering.
4. Deletes are explicit events.
5. Retry state and last error are durable and observable.
6. A provider outage never causes a silent fallback write to the other provider.
7. Authority changes require reconciliation and a documented rollback point.

## Current implementation boundary

The runtime resolver and guarded server-only MySQL pool are foundational infrastructure. Blog administration is being moved behind a provider-selectable repository. The existing Supabase outbox and MySQL consumer cover only a seven-table content pilot and only Supabase-to-MySQL delivery. Reverse replication and the rest of the website domains (orders, payments, profiles, services, notifications, social orders, discounts, AI profiles, and other RPC-backed flows) remain outside the pilot.

Consequently, do not set either domain override to MySQL until the real cPanel test schema audit and CRUD tests pass; do not set dual mode for production; and do not assume cross-database replication until the corresponding outbox, reverse consumer, and reconciliation tests have passed. This document intentionally distinguishes runtime capability from completed domain coverage.


## Test database schema gate

The read-only script scripts/mysql-sync-bridge/validate-application-schema-test-only.sql checks the required columns and key relationships for the two initial MySQL repositories. It must be run only after selecting tusancni_test. It does not create or alter tables and does not prove row parity; compare counts and exercise create/update/delete separately.


## Full schema inventory and DDL draft

The checked-in metadata snapshot scripts/mysql-schema/supabase-schema-manifest-2026-10-31.json records the current 61 tables across public/private, 661 columns, 237 indexes, 94 foreign-key columns, and 69 non-generated CHECK constraints. It includes no row contents or secrets, and explicitly records the PostgreSQL identity column used by private.blog_post_views so MariaDB emits AUTO_INCREMENT for it. scripts/mysql-schema/generate-schema.mjs emits a fresh-schema MariaDB DDL draft from this snapshot. The generated DDL passed a disposable MariaDB 11.4 CI test: 61 tables and 94 foreign keys were created; the private.blog_post_views identity column is also asserted as AUTO_INCREMENT. The first run reported 31 portability warnings and 69 CHECK constraints requiring manual translation. The workflow publishes the generated draft as a short-lived artifact for review. scripts/mysql-schema/audit-cpanel-test-read-only.sql compares all 61 expected tables and 650 columns, plus primary keys, index names, foreign keys and row estimates, against the selected cPanel database using only session-scoped temporary tables and SELECT queries. It is not an ALTER migration for an existing cPanel database. The generator includes explicit VARCHAR overrides for text fields used in MariaDB generated unique-key expressions. It maps only partial unique indexes with a verified MariaDB expression; the partial unique child-form-title index is deliberately deferred for manual translation after MariaDB 11.4 rejected its generated-column expression. PostgreSQL CHECK constraints are also reported for manual translation; unsupported partial/expression indexes are reported rather than silently copied. Do not execute the draft on tusancni_main or tusancni_test.
