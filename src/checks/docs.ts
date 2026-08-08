import path from "node:path";
import type { CheckResult } from "../types.js";
import { findFirst, readText } from "../fs.js";

export async function checkDocs(root: string): Promise<CheckResult[]> {
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

  return results;
}
