#!/usr/bin/env node
/**
 * Read-only inventory of Supabase usage in the Tosan website source tree.
 * It deliberately reports paths/line numbers/categories only, never source
 * lines or environment-variable values, to reduce the chance of leaking secrets.
 *
 * Usage: node scripts/audit-supabase-usage.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([
  ".git", "node_modules", ".next", "out", "dist", "coverage",
  ".turbo", ".vercel", ".cache", "vendor",
]);
const ignoredFiles = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
]);
const sourceExtensions = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql",
  ".json", ".md", ".yml", ".yaml",
]);
const patterns = [
  ["supabase_import", /@supabase\//i],
  ["supabase_client_factory", /create(?:Browser|Server|Client)Client|createClient\s*\(/],
  ["table_query", /\.from\s*\(\s*["'`]/],
  ["rpc_call", /\.rpc\s*\(/],
  ["auth", /\.auth\.(?:getUser|getSession|signIn|signUp|signOut|resetPassword|updateUser|verifyOtp|exchangeCodeForSession|resend|admin)\b|supabase\.auth\b/i],
  ["storage", /\.storage\.(?:from|createBucket|listBuckets|removeBucket|updateBucket)\b|storage\.from\s*\(/i],
  ["realtime", /\.channel\s*\(|\.on\s*\(\s*["']postgres_changes|\.subscribe\s*\(/],
  ["edge_functions", /\.functions\.invoke\s*\(/],
  ["supabase_env", /(?:NEXT_PUBLIC_)?SUPABASE_(?:URL|ANON_KEY|PUBLISHABLE_KEY|SERVICE_ROLE_KEY|SECRET_KEY)\b|NEXT_PUBLIC_SUPABASE_/i],
  ["supabase_url_or_host", /supabase\.co|supabase\.in/i],
  ["supabase_name", /\bsupabase\b/i],
];

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".env")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(full, results);
      continue;
    }
    if (!entry.isFile() || ignoredFiles.has(entry.name)) continue;
    if (!sourceExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const relative = path.relative(root, full).split(path.sep).join("/");
    if (relative.startsWith("docs/")) continue;
    let text;
    try {
      text = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue;
    const lines = text.split(/\r?\n/);
    const matches = [];
    lines.forEach((line, index) => {
      const categories = patterns
        .filter(([, regex]) => regex.test(line))
        .map(([name]) => name);
      if (categories.length) {
        matches.push({ line: index + 1, categories });
      }
    });
    if (matches.length) results.push({ file: relative, matches });
  }
}

const results = [];
walk(root, results);
results.sort((a, b) => a.file.localeCompare(b.file));

const totals = Object.fromEntries(patterns.map(([name]) => [name, 0]));
for (const item of results) {
  for (const match of item.matches) {
    for (const category of match.categories) totals[category]++;
  }
}
console.log("Supabase source dependency inventory (paths and line numbers only)");
console.log("Root: " + root);
console.log("Files with matches: " + results.length);
console.log("Matching lines by category:");
for (const [category, count] of Object.entries(totals)) {
  if (count) console.log("  " + category + ": " + count);
}
console.log("\nFile map:");
for (const item of results) {
  const counts = {};
  for (const match of item.matches) {
    for (const category of match.categories) counts[category] = (counts[category] || 0) + 1;
  }
  const summary = Object.entries(counts).map(([key, count]) => key + "=" + count).join(", ");
  const importantLines = item.matches
    .filter((match) => match.categories.some((category) =>
      ["table_query", "rpc_call", "auth", "storage", "realtime", "edge_functions"].includes(category)))
    .map((match) => match.line);
  const lineSummary = importantLines.length ? " | operation lines: " + [...new Set(importantLines)].slice(0, 20).join(",") : "";
  console.log(item.file + " | " + summary + lineSummary);
}
console.log("\nSafety: no source-line contents, .env files, or environment values are printed.");
