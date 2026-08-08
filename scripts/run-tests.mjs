import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (/\.test\.[cm]?[jt]s$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = await collect(testsDir);
if (files.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit", cwd: root, shell: false },
);

child.on("exit", (code) => process.exit(code ?? 1));
