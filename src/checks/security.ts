import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, listFiles, readText } from "../fs.js";

const SECRET_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "aws", label: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  {
    id: "private_key",
    label: "Private key block",
    re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  },
  {
    id: "github_pat",
    label: "GitHub token-like string",
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/,
  },
];

const GENERIC_ASSIGNMENT =
  /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"]([^'"]{12,})['"]/gi;

const PLACEHOLDER_VALUE =
  /^(your[_-]?|my[_-]?|example|sample|dummy|changeme|placeholder|xxx+|test|todo|password|secret|token)/i;

function looksLikeHardcodedSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 12) return false;
  if (/\s/.test(trimmed)) return false; // UI copy / sentences
  if (PLACEHOLDER_VALUE.test(trimmed)) return false;
  if (/^\*+$/.test(trimmed)) return false;
  // Prefer values that look credential-like, not plain words.
  return /[0-9]/.test(trimmed) || /[^A-Za-z0-9]/.test(trimmed);
}

const RISKY_NAMES = [
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json",
];

export async function checkSecurity(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const files = await listFiles(root);

  const riskyPresent = files.filter((f) =>
    RISKY_NAMES.some((name) => f === name || f.endsWith(`/${name}`)),
  );

  results.push({
    id: "security.sensitive_files",
    category: "security",
    title: "Sensitive files",
    severity: riskyPresent.length > 0 ? "fail" : "pass",
    weight: 3,
    message:
      riskyPresent.length > 0
        ? `Possibly sensitive files in the tree: ${riskyPresent.slice(0, 5).join(", ")}`
        : "No common sensitive filenames found in the working tree scan.",
    hint:
      riskyPresent.length > 0
        ? "Remove secrets from the repo and add them to .gitignore."
        : undefined,
  });

  const gitignore = await readText(path.join(root, ".gitignore"));
  if (!gitignore) {
    results.push({
      id: "security.gitignore",
      category: "security",
      title: ".gitignore",
      severity: "warn",
      weight: 2,
      message: "No .gitignore file found.",
      hint: "Add .gitignore rules for .env, build output, and editor files.",
    });
  } else if (!/\.env/i.test(gitignore)) {
    results.push({
      id: "security.gitignore",
      category: "security",
      title: ".gitignore",
      severity: "warn",
      weight: 2,
      message: ".gitignore exists but does not mention .env files.",
      hint: "Add `.env` and `.env.*` to reduce accidental secret commits.",
    });
  } else {
    results.push({
      id: "security.gitignore",
      category: "security",
      title: ".gitignore",
      severity: "pass",
      weight: 2,
      message: ".gitignore includes env-related rules.",
    });
  }

  const scanTargets = files.filter((f) =>
    /\.(ts|tsx|js|jsx|py|go|env|yml|yaml|json|toml|ini|sh|ps1|rb|php|java|cs)$/i.test(
      f,
    ),
  );

  const findings: string[] = [];
  for (const rel of scanTargets.slice(0, 500)) {
    if (
      rel.includes("package-lock.json") ||
      rel.includes("pnpm-lock.yaml") ||
      rel.includes("yarn.lock") ||
      /(^|\/)(fixtures?|examples?|mocks?)\//i.test(rel)
    ) {
      continue;
    }
    const text = await readText(path.join(root, rel));
    if (!text) continue;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(text)) {
        findings.push(`${rel} (${pattern.label})`);
      }
    }
    GENERIC_ASSIGNMENT.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = GENERIC_ASSIGNMENT.exec(text)) !== null) {
      if (looksLikeHardcodedSecret(match[1] ?? "")) {
        findings.push(`${rel} (Hard-coded token assignment)`);
        break;
      }
    }
  }

  results.push({
    id: "security.secret_patterns",
    category: "security",
    title: "Secret patterns",
    severity: findings.length > 0 ? "fail" : "pass",
    weight: 3,
    message:
      findings.length > 0
        ? `Possible secrets detected: ${findings.slice(0, 5).join("; ")}`
        : "No high-confidence secret patterns detected in scanned files.",
    hint:
      findings.length > 0
        ? "Rotate exposed credentials and remove them from history if needed."
        : undefined,
  });

  results.push({
    id: "security.policy",
    category: "security",
    title: "Security policy",
    severity: (await exists(path.join(root, "SECURITY.md"))) ? "pass" : "info",
    weight: 1,
    message: (await exists(path.join(root, "SECURITY.md")))
      ? "SECURITY.md is present."
      : "No SECURITY.md found.",
    hint: (await exists(path.join(root, "SECURITY.md")))
      ? undefined
      : "Optional file that tells people how to report vulnerabilities.",
  });

  const dependabot =
    (await exists(path.join(root, ".github", "dependabot.yml"))) ||
    (await exists(path.join(root, ".github", "dependabot.yaml")));
  results.push({
    id: "security.dependabot",
    category: "security",
    title: "Dependency updates",
    severity: dependabot ? "pass" : "info",
    message: dependabot
      ? "Dependabot config found."
      : "No Dependabot/Renovate config found.",
    hint: dependabot
      ? undefined
      : "Automating dependency updates reduces security debt.",
  });

  return results;
}
