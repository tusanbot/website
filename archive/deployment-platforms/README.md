# Retired deployment-platform configuration

This directory preserves the former Vercel and Cloudflare deployment files for reference.
They are intentionally outside the active application configuration and are not used by the build.

- Vercel's `vercel.json` included two scheduled jobs. Recreate those schedules in cPanel Cron or another host-native scheduler before relying on automatic execution.
- Cloudflare's `wrangler.jsonc` and `open-next.config.ts` configured the OpenNext/Workers runtime.
- The Vercel redeploy marker files and Cloudflare redeploy marker are retained as historical records.
- `public-vercel.svg` is retained only as an archived asset.

The active app remains a Next.js application packaged for a Node.js host. No deployment or production configuration was changed on the operational branch.
