import path from "node:path";
import type { CheckResult } from "../types.js";
import { findFirst, readText } from "../fs.js";

interface DocsCheckOptions {
  checkLinks: boolean;
  offline: boolean;
}

function parseMarkdownLinks(markdown: string): string[] {
  const links = new Set<string>();
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(regex)) {
    const rawTarget = (match[1] ?? "").trim();
    if (!rawTarget) continue;

    const normalized = rawTarget
      .replace(/^<|>$/g, "")
      .replace(/^"|"$/g, "")
      .split(/\s+/)[0]
      ?.trim();

    if (!normalized) continue;
    if (normalized.startsWith("#")) continue;
    if (normalized.startsWith("mailto:")) continue;
    if (normalized.startsWith("tel:")) continue;

    const lower = normalized.toLowerCase();
    if (
      lower.startsWith("http://localhost") ||
      lower.startsWith("https://localhost") ||
      lower.startsWith("http://127.0.0.1") ||
      lower.startsWith("https://127.0.0.1")
    ) {
      continue;
    }

    if (!/^https?:\/\//i.test(normalized)) continue;
    links.add(normalized);
  }

  return [...links];
}

async function fetchWithTimeout(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "repoaudit-link-check/1.0" },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkSingleLink(url: string): Promise<{ url: string; ok: boolean }> {
  try {
    const head = await fetchWithTimeout(url, "HEAD", 2500);
    if (head.ok) return { url, ok: true };
    if (head.status === 405 || head.status === 501) {
      const get = await fetchWithTimeout(url, "GET", 2500);
      return { url, ok: get.ok };
    }
    return { url, ok: false };
  } catch {
    return { url, ok: false };
  }
}

async function checkLinks(
  links: string[],
  concurrency: number,
): Promise<{ broken: string[]; checked: number }> {
  const queue = [...links];
  const broken: string[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      const result = await checkSingleLink(next);
      if (!result.ok) broken.push(result.url);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, links.length) }, () =>
    worker(),
  );
  await Promise.all(workers);

  return { broken, checked: links.length };
}

export async function checkDocs(
  root: string,
  options: DocsCheckOptions = { checkLinks: false, offline: false },
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const readme = await findFirst(root, [
    "README.md",
    "Readme.md",
    "readme.md",
    "README.rst",
    "README.txt",
  ]);

  if (!readme) {
    results.push({
      id: "docs.readme",
      category: "docs",
      title: "README",
      severity: "fail",
      weight: 3,
      message: "No README file found in the repository root.",
      hint: "Add README.md with install steps, usage, and a short project pitch.",
    });
    return results;
  }

  const text = (await readText(readme)) ?? "";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  results.push({
    id: "docs.readme",
    category: "docs",
    title: "README",
    severity: lines.length < 10 ? "warn" : "pass",
    weight: 3,
    message:
      lines.length < 10
        ? `Found ${path.basename(readme)}, but it looks too short.`
        : `Found ${path.basename(readme)}.`,
    hint:
      lines.length < 10
        ? "Expand it with install, usage examples, and contribution notes."
        : undefined,
  });

  const lower = text.toLowerCase();
  const hasUsage = /(install|usage|getting started|quick start|how to use)/i.test(
    lower,
  );
  results.push({
    id: "docs.readme.usage",
    category: "docs",
    title: "Install / usage docs",
    severity: hasUsage ? "pass" : "warn",
    weight: 2,
    message: hasUsage
      ? "README includes install/usage guidance."
      : "README does not clearly describe install/usage.",
    hint: hasUsage
      ? undefined
      : "Add Install and Usage sections with copy-pasteable commands.",
  });

  const hasDemo =
    /```/.test(text) ||
    /!\[/.test(text) ||
    /screenshot|demo|example/i.test(text);
  results.push({
    id: "docs.readme.demo",
    category: "docs",
    title: "Demo / examples",
    severity: hasDemo ? "pass" : "warn",
    weight: 1,
    message: hasDemo
      ? "README includes code examples or visuals."
      : "README has no obvious demo, screenshot, or code sample.",
    hint: hasDemo
      ? undefined
      : "Add a short demo command block or screenshot — it boosts adoption.",
  });

  const hasBadges = /shields\.io|badge|img\.shields/i.test(text);
  results.push({
    id: "docs.readme.badges",
    category: "docs",
    title: "Status badges",
    severity: hasBadges ? "pass" : "info",
    message: hasBadges
      ? "README includes status badges."
      : "No status badges detected.",
    hint: hasBadges
      ? undefined
      : "Badges for CI, license, and npm make the project look maintained.",
  });

  if (options.checkLinks) {
    const links = parseMarkdownLinks(text);

    if (options.offline) {
      results.push({
        id: "docs.readme.links",
        category: "docs",
        title: "README links",
        severity: "info",
        message: `Skipped checking ${links.length} README link(s) due to --offline.`,
      });
    } else if (links.length === 0) {
      results.push({
        id: "docs.readme.links",
        category: "docs",
        title: "README links",
        severity: "info",
        message: "No external README links found to verify.",
      });
    } else {
      const { broken, checked } = await checkLinks(links, 4);
      results.push({
        id: "docs.readme.links",
        category: "docs",
        title: "README links",
        severity: broken.length === 0 ? "pass" : "warn",
        weight: 1,
        message:
          broken.length === 0
            ? `Checked ${checked} README link(s); all reachable.`
            : `Found ${broken.length} unreachable README link(s) out of ${checked}.`,
        hint:
          broken.length === 0
            ? undefined
            : `Fix or remove broken links: ${broken.slice(0, 3).join(", ")}${
                broken.length > 3 ? ", ..." : ""
              }`,
      });
    }
  }

  return results;
}
