# Tosan Website

Tosan is a Persian-language web application built with Next.js, React, and TypeScript.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation and production build

```bash
npm run lint
npm run build
```

For a self-contained Node.js release suitable for a conventional Node.js application host:

```bash
CPANEL_BUILD=1 npm run build
```

This produces the Next.js standalone server under `.next/standalone`. The production process should run on a supported Node.js host with the required environment variables configured.

Deployment configuration for Vercel and Cloudflare has been retired and preserved under `archive/deployment-platforms/`. The archived files are not part of the active build.
