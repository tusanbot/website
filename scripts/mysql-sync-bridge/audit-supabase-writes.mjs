import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOTS = ["app", "components", "lib", "admin", "hooks", "contexts", "pages"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

async function collectFiles(directory, output = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return output;
    throw error;
  }

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await collectFiles(absolute, output);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      output.push(absolute);
    }
  }
  return output;
}

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function inspectSource(source, file) {
  const findings = [];
  const fromPattern = /\.from\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  let match;

  while ((match = fromPattern.exec(source))) {
    const tail = source.slice(fromPattern.lastIndex, fromPattern.lastIndex + 1200);
    const mutation = /\.\s*(insert|upsert|update|delete)\s*\(/.exec(tail);
    if (mutation) {
      findings.push({
        file,
        line: lineAt(source, match.index),
        kind: "table-mutation",
        target: match[2],
        operation: mutation[1],
      });
    }
  }

  const rpcPattern = /\.rpc\(\s*(['"`])([^'"`]+)\1/g;
  while ((match = rpcPattern.exec(source))) {
    findings.push({
      file,
      line: lineAt(source, match.index),
      kind: "rpc-call-review",
      target: match[2],
      operation: "rpc",
    });
  }

  return findings;
}

const files = [];
for (const root of ROOTS) await collectFiles(root, files);
files.sort();

const findings = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  findings.push(...inspectSource(source, file.replaceAll(path.sep, "/")));
}

console.log("Supabase write-path static audit (candidate inventory; review findings manually)");
const tableMutations = findings.filter((item) => item.kind === "table-mutation").length;\nconst rpcCandidates = findings.filter((item) => item.kind === "rpc-call-review").length;\nconsole.log(`Scanned ${files.length} source files; found ${tableMutations} table-mutation candidates and ${rpcCandidates} RPC candidates for manual classification.`);
for (const item of findings) {
  console.log(`${item.file}:${item.line}\t${item.kind}\t${item.operation}\t${item.target}`);
}
console.log("Limitations: this regex audit may miss aliased query builders, dynamic table names, indirect helper calls, SQL strings, and external writers. It is not proof of complete coverage.");
