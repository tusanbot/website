# cPanel MariaDB sync consumer (pilot)

> The website no longer needs a separately hosted bridge. The active consumer is
> `lib/data-access/mysql-sync-consumer.ts`, imported by the authenticated Next.js
> dispatcher at `app/api/internal/data-sync/dispatch/route.ts` and executed in
> the cPanel Node.js runtime. This directory is retained for the existing mapping
> tests and historical bridge draft only.

## Current safety state

- Supabase remains the authoritative database.
- The dispatcher is hard-locked to `MYSQL_DATABASE=tusancni_test`; it refuses any other database name.
- The consumer accepts only the seven pilot tables: `blog_posts`, `blog_categories`,
  `blog_post_services`, `blog_comments`, `blog_reactions`, `blog_ratings`,
  and `services_announcements`.
- It uses a server-only mysql2 connection pool. No MySQL credential is exposed to browser code.
- The Supabase outbox migration has not been applied and the dispatcher must remain unscheduled until
  the final schema adjustments and end-to-end event tests are approved.
- Do not configure `tusancni_main`, do not run this consumer against production, and do not switch
  application reads or writes to MariaDB.

## cPanel environment

Configure these variables in the existing cPanel Node.js application environment (never commit a
`.env` file):

- `MYSQL_HOST`: database host, normally the cPanel-provided local MySQL hostname.
- `MYSQL_PORT`: optional, defaults to `3306`.
- `MYSQL_USER`: dedicated least-privilege user scoped to `tusancni_test`.
- `MYSQL_PASSWORD`: password for that user.
- `MYSQL_DATABASE=tusancni_test`: mandatory; the code rejects any other database.
- `MYSQL_SSL=1`: optional and only when the host provides certificate-validated TLS.
- `DATA_SYNC_DISPATCH_SECRET`: random secret of at least 32 characters, used by the dispatcher endpoint.

The MySQL user should have only SELECT, INSERT, UPDATE, and DELETE on the seven pilot tables and the
two sync metadata tables. Do not grant schema-alteration or global privileges.

## Before enabling dispatch

1. Verify the environment variable points to `tusancni_test`, not `tusancni_main`.
2. Confirm the metadata tables `data_sync_event_receipts` and `data_sync_record_versions` exist in
   `tusancni_test` (they have already been created in the current test database).
3. Apply the read-only `validate-destination-test-only.sql` in phpMyAdmin with `tusancni_test`
   selected, only if a new validation run is specifically required. It does not modify data.
4. Review and apply the required destination schema adjustment for the `blog_posts.slug` unique
   constraint before event testing. Do not silently truncate slugs.
5. Install dependencies and build the cPanel release. Verify that the resulting Next.js server runs
   with Node.js runtime support.
6. Only after the application build and connection test pass, review the Supabase outbox migration.
   It is not applied by this code change.
7. Trigger a controlled test event and verify insert, update, delete, duplicate replay, stale replay,
   and retry after a temporary database outage.
8. Configure a cPanel cron request to the authenticated dispatcher only after the manual event tests
   pass. Do not schedule it yet.

## Event behavior

- The authenticated route claims up to 20 ordered outbox events from Supabase.
- Each event is applied to MariaDB and its receipt/version metadata in one InnoDB transaction.
- Event receipts make retries idempotent, including the case where MariaDB commits but the Supabase
  queue acknowledgement fails.
- Per-record source outbox IDs prevent an older event from overwriting a newer event.
- Deletes are applied by the actual destination primary key and leave a version tombstone.
- Only after MariaDB commits does the route mark the Supabase event processed.
- Failed events are released with bounded exponential retry metadata.

## Limitations

This is a write-only mirror consumer, not a MariaDB read adapter. It does not enable `DATA_PRIMARY=mysql`,
change any public/admin read path, or redirect application writes. Supabase remains the only active
application data source. The code has not yet been tested against a live cPanel MariaDB connection.
