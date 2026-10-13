# cPanel deployment runbook (manual, no automatic production deploy)

## What the GitHub artifact contains

The workflow builds Next.js in standalone mode and uploads `release-cpanel.tar.gz`. The archive contains the generated `server.js`, an `app.js` wrapper for cPanel's Node.js Application Manager, traced runtime dependencies, `.next/static`, `public/` when present, and `RELEASE-INFO.txt`.

The workflow is validation and packaging only. It does **not** connect to or change the live cPanel account.

## Before deploying

1. Confirm the workflow is green and download the artifact from that exact run.
2. Confirm the artifact's `RELEASE-INFO.txt` commit matches the intended branch commit.
3. In cPanel, back up the current application directory and its runtime configuration. Keep `.env.production` and all credentials outside the release archive and do not upload them to GitHub.
4. Use a separate test application/root first if the hosting plan allows it. Verify login, Google authentication, order creation, payment callbacks, uploads, announcements, and admin pages before switching the live application.

## Runtime configuration

Keep server-side secrets in cPanel's **Runtime variables and secrets** / Node.js environment settings. Never put `SUPABASE_SERVICE_ROLE_KEY` in GitHub Actions secrets intended for client code or in a public file.

The public Supabase URL and anon key are compiled into the browser bundle at build time, so the workflow requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub Actions repository secrets. Other server-only environment variables (including `SUPABASE_SERVICE_ROLE_KEY` and `PUBLIC_SITE_URL`) must be set in cPanel as required by the application.

Use Node.js 22.x to match the CI build. In cPanel, configure the application startup file as `app.js` and ensure the app root points to the extracted release directory. Restart the application after changing the release or runtime variables.

## Extract and smoke-test without overwriting the live app

Upload the archive to a new, empty release directory (not the existing production directory), then extract it:

```bash
mkdir -p ~/releases/tusan-<commit>
tar -xzf ~/release-cpanel.tar.gz -C ~/releases/tusan-<commit>
test -f ~/releases/tusan-<commit>/app.js
test -f ~/releases/tusan-<commit>/server.js
cat ~/releases/tusan-<commit>/RELEASE-INFO.txt
```

Configure a separate cPanel Node.js application to use that release directory if your hosting plan supports a staging app. Do not point the production domain at it until the checks pass. cPanel supplies the listening port for its Node.js application; retain that environment variable and set `NODE_ENV=production`.

## Rollback

Before switching production, keep the previous application directory intact and record its release/commit. If smoke tests fail, point the cPanel Node.js application back to the previous directory (or restore the backed-up files and startup script), restore the previous runtime environment settings, and restart the app. Do not delete the previous release until the new release has been stable and a verified backup exists.

## Important limitations

- A green CI run confirms compilation and packaging, not live database access, OAuth redirect configuration, payment provider callbacks, or production health.
- This archive is for the current cPanel Node.js runtime, not Cloudflare Workers.
- Do not run database migrations as part of a code deployment unless a separately reviewed, backed-up migration plan explicitly requires it.
