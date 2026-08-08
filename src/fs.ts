import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function findFirst(
  root: string,
  names: string[],
): Promise<string | null> {
  for (const name of names) {
    const full = path.join(root, name);
    if (await exists(full)) return full;
  }
  return null;
}

export async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist" ||
        entry.name === "coverage" ||
        entry.name === ".next"
      ) {
        continue;
      }

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(path.relative(root, full).replaceAll("\\", "/"));
      }
    }
  }

  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) return out;
  await walk(root);
  return out;
}
