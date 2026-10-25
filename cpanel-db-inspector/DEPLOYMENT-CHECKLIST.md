# Deployment checklist — cPanel-only inspector

This application is intentionally independent from the Next.js / Cloudflare app. Deploy it only as a separate PHP document root or subdomain.

## Before deployment

- [ ] Review the draft PR and pass PHP lint CI.
- [ ] Create a separate cPanel subdomain and document root, e.g. `db-inspector.tusancn.ir`.
- [ ] Ensure the selected hosting plan runs a supported PHP 8+ version with PDO MySQL enabled.
- [ ] Issue and verify TLS for the subdomain. The included `.htaccess` redirects HTTP to HTTPS.
- [ ] Create a dedicated MySQL user with **SELECT only** privileges on the intended database. Do not use the database owner/admin account.
- [ ] Confirm the MySQL user cannot INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, GRANT, or access unrelated schemas.
- [ ] Create the external config file outside the document root. Do not commit it or upload it into the web root.
- [ ] Generate a long unique inspector password and store only its `password_hash()` result in the config.
- [ ] Add only verified tables and columns to the server-side allowlist. Exclude credentials, tokens, password hashes, payment secrets, private messages, and personal data not required for diagnostics.
- [ ] Restrict the subdomain at the web-server or hosting layer by IP/VPN/HTTP authentication where feasible. Session-based lockout alone is not a complete brute-force defense.
- [ ] Ensure PHP error display is disabled for production; errors should go only to private server logs.
- [ ] Confirm no production credentials, dumps, or customer records are present in Git or the deployed directory.

## Smoke tests

- [ ] Unauthenticated requests show only the login screen.
- [ ] Invalid passwords fail without revealing configuration or database details.
- [ ] HTTPS is enforced and session cookies are Secure, HttpOnly, and SameSite=Strict.
- [ ] Correct password grants access; logout invalidates the session.
- [ ] Unknown table names and non-allowlisted columns cannot be requested.
- [ ] Search text containing quotes and SQL-like strings is treated as ordinary text.
- [ ] Search and pagination work; requests for pages beyond the end return an empty/final page rather than huge offsets.
- [ ] HTML-like data renders as text, not executable markup.
- [ ] A read-only MySQL account cannot modify data even if the application is compromised.
- [ ] Temporarily wrong DB settings show a generic error in the browser and no credentials/SQL details.
- [ ] Review web-server/PHP logs and confirm no secrets are written.
- [ ] Confirm the Cloudflare/OpenNext deployment and build configuration remain untouched.

## Rollback

Disable the subdomain or remove its document-root files. Revoke the dedicated read-only MySQL user and remove the external config file. This inspector performs no writes to the database, so disabling it does not require database rollback.

## Important limitations

The current prototype does not implement per-user accounts, MFA, comprehensive IP-based rate limiting, schema discovery, data export, sorting controls, or automatic row-count dashboards. Do not expose it publicly until the deployment controls above are in place and the PHP code has passed syntax and manual security review.
