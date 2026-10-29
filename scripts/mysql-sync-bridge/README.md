# Tosan MariaDB sync bridge (pilot)

This is a separate Node.js service intended for a cPanel Node.js app or another trusted Node.js host. It is **not** part of the Cloudflare Worker runtime and is not deployed by the website's Next.js build.

## Safety status

- Default table allowlist is limited to the first blog/announcement pilot.
- No arbitrary SQL endpoint exists. Table names are static allowlisted; column names must exist in the selected destination table and pass identifier validation.
- The service binds to `127.0.0.1`. Put it behind an HTTPS reverse proxy; do not expose the plain HTTP port to the public internet.
- It does not create or alter business tables.
- The metadata SQL file must be manually reviewed and run only against `tusancni_test`. Never run it against production `tusancni_main`.
- Do not start the service until the destination schema has been compared against the source and the metadata tables exist in the test database.
- This is a draft implementation and has not been run against the real schema in this repository context.

## Setup

1. Create a separate cPanel Node.js application using Node.js 20+ and install dependencies from this folder.
2. Configure environment variables in the hosting panel, never commit a `.env` file:
   - `PORT` (optional; defaults to 8788)
   - `MYSQL_HOST`, `MYSQL_PORT` (optional), `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `MYSQL_SYNC_BRIDGE_TOKEN` (random secret of at least 32 characters; must match the dispatcher's `MYSQL_SYNC_BRIDGE_TOKEN`)
   - `MYSQL_SSL=1` only when the MySQL endpoint supports certificate-validated TLS.
3. Point `MYSQL_DATABASE` at `tusancni_test` only during validation. Use a database user scoped to that database with only the required SELECT/INSERT/UPDATE/DELETE permissions on pilot tables and the two metadata tables.
4. Select `tusancni_test` explicitly in phpMyAdmin and run `validate-destination-test-only.sql` first. Verify the first result says `tusancni_test`, inspect all duplicate/length issue counts (they should be zero), and compare the row counts with Supabase. This validation script is read-only.
5. Only after review, run `schema-test-only.sql` manually in phpMyAdmin with `tusancni_test` selected; it creates the two sync-metadata tables.
6. Run `npm install`, then `npm run check`, then start behind an HTTPS reverse proxy.
7. Check `GET /healthz` and send test events from a controlled test source. Do not apply the Supabase outbox migration or configure a scheduled dispatcher until the schema mapping and retry tests pass.

## Event behavior

- `POST /v1/events`, bearer-authenticated JSON.
- Accepts only `public` and the static pilot table allowlist.
- Requires the event key to match the actual destination primary key exactly.
- Rejects source columns absent from the destination; no silent truncation or guessed field mapping.
- Applies changes and the event receipt in one transaction. Replayed event IDs are acknowledged without reapplying.
- A per-record version keyed by a stable hash prevents an older source outbox event from overwriting a newer applied event. `source_outbox_id` is the ordering sequence.
- Delete events are applied by primary key and recorded as a version, so an older insert/update cannot resurrect a deleted row.
- Acknowledges only after commit, echoing the exact `event_id`.

## Known constraints before use

- Actual source/destination schema parity has not been verified end to end. The read-only `validate-destination-test-only.sql` script checks duplicate/invalid slugs, composite-key duplicates, relevant column definitions, and row counts; it must be run by an operator in `tusancni_test` before schema changes or write tests.
- Explicit JSON-to-text mappings are implemented only for `blog_posts.seo_keywords` (Supabase `text[]` serialized as JSON text) and `services_announcements.documents` (Supabase `jsonb` serialized as JSON text). These mappings have unit tests; arbitrary objects/arrays in other non-JSON columns are still rejected.
- Timestamp policy: source ISO timestamps must include a timezone; the bridge normalizes them to UTC before writing to MariaDB `DATETIME`, preserving up to six fractional digits. Application reads must interpret these `DATETIME` values as UTC. Unit tests cover offset normalization and microseconds.
- `npm run check` runs Node syntax checks and unit tests for the explicit field mappings. This does not test real MariaDB writes, outbox SQL, or end-to-end delivery.
- The allowlist must be narrowed or expanded only after table-by-table schema validation.
- Network/TLS proxy, least-privilege DB user, process supervision, and request timeouts must be tested on the target host.
- Do not switch data authority or enable production sync from this draft.
