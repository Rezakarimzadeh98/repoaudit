import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, listFiles, readText } from "../fs.js";

const SECRET_PATTERNS: Array<{ id: string; label: string; re: RegExp }> = [
  {
    id: "aws",
    label: "AWS access key",
    re: /AKIA[0-9A-Z]{16}/,
  },
  {
    id: "private_key",
    label: "Private key block",
    re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  },
  {
    id: "generic_token",
    label: "Hard-coded token assignment",
    re: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i,
  },
];

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

  if (riskyPresent.length > 0) {
    results.push({
      id: "security.sensitive_files",
      title: "Sensitive files",
      severity: "fail",
      message: `Possibly sensitive files tracked in the tree: ${riskyPresent.slice(0, 5).join(", ")}`,
      hint: "Remove secrets from the repo and add them to .gitignore.",
    });
  } else {
    results.push({
      id: "security.sensitive_files",
      title: "Sensitive files",
      severity: "pass",
      message: "No common sensitive filenames found in the working tree scan.",
    });
  }

  const gitignore = await readText(path.join(root, ".gitignore"));
  if (!gitignore) {
    results.push({
      id: "security.gitignore",
      title: ".gitignore",
      severity: "warn",
      message: "No .gitignore file found.",
      hint: "Add .gitignore rules for .env, build output, and editor files.",
    });
  } else if (!/\.env/i.test(gitignore)) {
    results.push({
      id: "security.gitignore",
      title: ".gitignore",
      severity: "warn",
      message: ".gitignore exists but does not mention .env files.",
      hint: "Add `.env` and `.env.*` to reduce accidental secret commits.",
    });
  } else {
    results.push({
      id: "security.gitignore",
      title: ".gitignore",
      severity: "pass",
      message: ".gitignore includes env-related rules.",
    });
  }

  const scanTargets = files.filter((f) =>
    /\.(ts|tsx|js|jsx|py|go|env|yml|yaml|json|toml|ini|sh|ps1)$/i.test(f),
  );

  const findings: string[] = [];
  for (const rel of scanTargets.slice(0, 400)) {
    if (rel.includes("package-lock.json") || rel.includes("pnpm-lock.yaml")) {
      continue;
    }
    const text = await readText(path.join(root, rel));
    if (!text) continue;
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(text)) {
        findings.push(`${rel} (${pattern.label})`);
      }
    }
  }

  if (findings.length > 0) {
    results.push({
      id: "security.secret_patterns",
      title: "Secret patterns",
      severity: "fail",
      message: `Possible secrets detected: ${findings.slice(0, 5).join("; ")}`,
      hint: "Rotate exposed credentials and remove them from history if needed.",
    });
  } else {
    results.push({
      id: "security.secret_patterns",
      title: "Secret patterns",
      severity: "pass",
      message: "No high-confidence secret patterns detected in scanned files.",
    });
  }

  const securityMd = path.join(root, "SECURITY.md");
  results.push(
    (await exists(securityMd))
      ? {
          id: "security.policy",
          title: "Security policy",
          severity: "pass",
          message: "SECURITY.md is present.",
        }
      : {
          id: "security.policy",
          title: "Security policy",
          severity: "info",
          message: "No SECURITY.md found.",
          hint: "Optional file that tells people how to report vulnerabilities.",
        },
  );

  return results;
}
