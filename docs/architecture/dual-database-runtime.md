# Tusan dual-database runtime

## Objective

The application can run with Supabase only, MySQL only, or both providers available at the same time. This is an application-level capability, not merely two connection strings.

## Modes

- TUSAN_DATA_MODE=supabase: Supabase is the only active application provider.
- TUSAN_DATA_MODE=mysql: MySQL is the only active application provider.
- TUSAN_DATA_MODE=dual: both providers are configured. Every domain still has exactly one authoritative writer; the other database is a mirror reached through a durable outbox and idempotent consumer.

The default remains supabase to preserve existing production behavior.

## Routing

TUSAN_DATA_PRIMARY=supabase|mysql selects the default authority in dual mode. Domain overrides are supported for the first repository pilots:

- TUSAN_DATA_PROVIDER_BLOG_ADMIN=supabase|mysql
- TUSAN_DATA_PROVIDER_ANNOUNCEMENTS=supabase|mysql

Each domain's mirror target is derived as the opposite provider. A domain must never perform two independent writes and assume they form one transaction.

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
- TUSAN_DATA_SYNC_TARGET is optional; if supplied it must be the opposite provider.
- The sync target is not activated by the configuration resolver alone. A domain must have transactional outbox capture, reverse consumer, retry, replay protection, dead-letter visibility, and reconciliation before its mirror is enabled.

## Consistency contract

1. A domain has one writer of record at a time.
2. The authoritative row mutation and outbox event are committed in the same database transaction.
3. Delivery is at-least-once; consumers are idempotent and enforce per-record ordering.
4. Deletes are explicit events.
5. Retry state and last error are durable and observable.
6. A provider outage never causes a silent fallback write to the other provider.
7. Authority changes require reconciliation and a documented rollback point.

## Current implementation boundary

The runtime resolver and guarded server-only MySQL pool are foundational infrastructure. The existing Supabase outbox and MySQL consumer cover only a seven-table content pilot and only Supabase-to-MySQL delivery. The existing blog-admin and announcements interfaces still need complete MySQL implementations; the rest of the website domains (orders, payments, profiles, services, notifications, social orders, discounts, AI profiles, and other RPC-backed flows) remain outside the pilot.

Consequently, do not set either domain override to MySQL, do not set dual mode for production, and do not enable reverse sync until the corresponding repository and outbox tests have passed. This document intentionally distinguishes runtime capability from completed domain coverage.
