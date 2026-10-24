# Read-only MySQL Data Inspector

**Status:** design proposal only. No runtime route, dependency, database connection, or production data has been changed.
**Required base:** `cloudflare-migration`
**Preparation branch:** `cloudflare-migration-mysql-prep`

## Goal

Provide a protected administrative screen that reads the contents of the cPanel-hosted MySQL database directly and presents a database-oriented view of the data. It is for migration verification and data inspection, not a recreation of the site's business workflows. It should avoid building fake forms, checkout flows, registration flows, or other UI just to test whether imported records exist.

## Proposed screen

- **Overview:** connection status (without connection details), safely redacted database/schema identifier, last successful read time, total tables discovered, and row counts for approved tables.
- **Site sections:** group allowlisted tables into logical sections, for example Blog, Services, Registrations, Orders/Payments, Accounts/Profiles, Discounts, Support, and Other. Only show sections/tables that actually exist in the selected inspection schema; do not imply that a table was migrated if it is absent.
- **Table view:** table name, exact row count, paginated rows, sortable approved columns, and a search field. Search only selected searchable columns and use parameterized queries.
- **Record view:** show fields using type-aware formatting (dates, booleans, JSON, nulls), with long values expandable. Exclude or redact secrets and sensitive personal/payment fields by default.
- **Verification:** where a source snapshot is available, show source vs target counts and parity status separately. A matching count must be labelled “count matches” rather than “data verified”; full parity requires primary-key-set, normalized-row-hash, and relationship/orphan checks.

## Security and operational requirements

1. **Server-only database access.** The browser must never connect to MySQL directly. Keep credentials in server-side environment variables and never return them, raw driver errors, SQL text, or connection strings to the client.
2. **Dedicated read-only database account.** Grant only the required SELECT and metadata privileges on the isolated inspection database. Do not use a write-capable account for this screen.
3. **Real access control.** Protect both the page and every API/route handler with the existing verified admin identity/role mechanism. A hidden link, noindex, or client-side check is not authorization. Do not rely solely on a route prefix or an internal header unless its provenance is guaranteed by the server middleware.
4. **Strict allowlist.** Do not accept arbitrary table or column names from query parameters. Resolve a user selection through server-owned metadata/allowlists and quote identifiers safely; use bound parameters for search values.
5. **Read-only behavior.** No INSERT, UPDATE, DELETE, DDL, import, export-all, or mutation buttons. Apply query timeouts and bounded pagination; avoid unbounded table scans on every page load.
6. **Privacy by default.** Do not expose password hashes, access/refresh tokens, service-role keys, payment credentials, or unnecessary personal data. Use table-specific visible-column policies and redact fields that could contain secrets.
7. **Safe failures.** Return a generic error and correlation ID to the UI; log diagnostic detail server-side without credentials or row contents. If MySQL is not configured or unreachable, fail closed and keep the regular site working.
8. **Separate environment.** First point it only at an isolated test database. Do not enable it against production or route ordinary site features to MySQL as part of this work.
9. **Resource limits.** Use server-side pagination, a conservative maximum page size, debounced search, and indexed columns where possible. Display exact counts only when measured; label cached/estimated counts clearly.
10. **No automatic migration.** The inspector must never copy data or modify the source/target schema.

## Suggested implementation sequence

1. Inventory the actual target schema and decide which tables/columns are safe to inspect.
2. Add a dedicated read-only connection module, with server-only environment variables and explicit runtime compatibility checks for the deployment target.
3. Add a protected admin page and narrowly scoped read-only API handlers.
4. Add overview counts, section navigation, pagination, and parameterized search.
5. Add a verification view for source/target counts and stronger parity checks; clearly distinguish count comparison from full data equivalence.
6. Test authorization (including unauthenticated requests and non-admin users), missing credentials, missing tables, malformed search, large tables, and database timeouts.
7. Only after review, deploy the inspector to a protected test surface. Keep the live application on Supabase until a separately approved cutover.

## Compatibility and scope notes

- The active branch currently does not declare mysql2 and has no tracked root package-lock.json; dependency installation must be reconciled against cloudflare-migration, not copied blindly from another branch.
- The site uses Next.js with Cloudflare/OpenNext configuration while cPanel has also been used for deployment. Confirm the intended runtime for this inspector before choosing a driver/connection strategy; a TCP MySQL driver suitable for Node/cPanel may not be suitable for the Cloudflare runtime.
- Existing /mysql-test noindex metadata is not an access-control mechanism and should not be treated as a safe inspector.
- This proposal does not assert that the cPanel MySQL database is configured, reachable, populated, or equivalent to Supabase. Those facts require a separate authenticated live check.

## Acceptance criteria

- Only authorized administrators can view the page or call any endpoint.
- The browser receives only allowlisted, redacted row fields and bounded result pages.
- Searches are parameterized and table/column selection cannot inject SQL identifiers.
- All visible counts state whether they are exact, cached, or unavailable.
- The UI is strictly read-only and cannot change any record or schema.
- No source data, credentials, or production routing is changed by deploying the inspector.
- Count matches are never presented as proof of complete data parity.