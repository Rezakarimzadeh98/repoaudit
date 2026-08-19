export const COMMON_SPDX_IDS = new Set([
  "mit",
  "apache-1.0",
  "apache-1.1",
  "apache-2.0",
  "gpl-1.0",
  "gpl-1.0-only",
  "gpl-1.0-or-later",
  "gpl-2.0",
  "gpl-2.0-only",
  "gpl-2.0-or-later",
  "gpl-3.0",
  "gpl-3.0-only",
  "gpl-3.0-or-later",
  "lgpl-2.0",
  "lgpl-2.0-only",
  "lgpl-2.0-or-later",
  "lgpl-2.1",
  "lgpl-2.1-only",
  "lgpl-2.1-or-later",
  "lgpl-3.0",
  "lgpl-3.0-only",
  "lgpl-3.0-or-later",
  "agpl-3.0",
  "agpl-3.0-only",
  "agpl-3.0-or-later",
  "bsd-2-clause",
  "bsd-3-clause",
  "bsd-4-clause",
  "bsd-3-clause-clear",
  "isc",
  "unlicense",
  "cc0-1.0",
  "cc-by-3.0",
  "cc-by-4.0",
  "cc-by-sa-3.0",
  "cc-by-sa-4.0",
  "mpl-1.1",
  "mpl-2.0",
  "epl-1.0",
  "epl-2.0",
  "0bsd",
  "artistic-2.0",
  "wtfpl",
  "zlib",
  "ms-pl",
  "ms-rl",
  "postgresql",
  "ofl-1.1"
]);

export function isValidSpdxExpression(expr: string, options?: { allowNpmConventions?: boolean }): boolean {
  if (!expr || typeof expr !== "string") return false;
  const trimmed = expr.trim();
  if (trimmed.length === 0) return false;

  if (options?.allowNpmConventions) {
    if (trimmed === "UNLICENSED") return true;
    if (/^SEE LICENSE IN .+/i.test(trimmed)) return true;
  }

  const tokens = trimmed
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return false;

  const operators = new Set(["and", "or", "with"]);

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (operators.has(lowerToken)) {
      continue;
    }
    let cleanToken = lowerToken;
    if (cleanToken.endsWith("+")) {
      cleanToken = cleanToken.slice(0, -1);
    }
    if (COMMON_SPDX_IDS.has(cleanToken)) {
      continue;
    }
    if (/^licenseref-[a-z0-9.-]+$/i.test(cleanToken)) {
      continue;
    }
    return false;
  }
  return true;
}
