import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, listFiles, readText } from "../fs.js";

export async function checkCi(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const files = await listFiles(root);

  const ghWorkflows = files.filter(
    (f) => f.startsWith(".github/workflows/") && /\.(yml|yaml)$/i.test(f),
  );
  const otherCi = [
    ".gitlab-ci.yml",
    "azure-pipelines.yml",
    ".circleci/config.yml",
    "Jenkinsfile",
    "bitbucket-pipelines.yml",
  ];

  const foundOther: string[] = [];
  for (const rel of otherCi) {
    if (await exists(path.join(root, rel))) foundOther.push(rel);
  }

  if (ghWorkflows.length > 0) {
    results.push({
      id: "ci.workflows",
      category: "ci",
      title: "CI workflows",
      severity: "pass",
      weight: 3,
      message: `Found GitHub Actions workflows: ${ghWorkflows.join(", ")}`,
    });
  } else if (foundOther.length > 0) {
    results.push({
      id: "ci.workflows",
      category: "ci",
      title: "CI workflows",
      severity: "pass",
      weight: 3,
      message: `Found CI config: ${foundOther.join(", ")}`,
    });
  } else {
    results.push({
      id: "ci.workflows",
      category: "ci",
      title: "CI workflows",
      severity: "warn",
      weight: 3,
      message: "No CI configuration detected.",
      hint: "Add a simple GitHub Actions workflow for install/build/test.",
    });
  }

  const hasTests =
    files.some((f) => /(^|\/)tests?\//i.test(f)) ||
    files.some((f) => /\.(test|spec)\.[jt]sx?$/i.test(f)) ||
    files.some((f) => /_test\.go$/i.test(f)) ||
    files.some((f) => /test_.*\.py$/i.test(f)) ||
    files.some((f) => f.endsWith(".feature"));

  results.push({
    id: "ci.tests",
    category: "ci",
    title: "Automated tests",
    severity: hasTests ? "pass" : "warn",
    weight: 3,
    message: hasTests
      ? "Test files or a tests directory were found."
      : "No obvious test files found.",
    hint: hasTests
      ? undefined
      : "Add at least a few unit tests for core behavior.",
  });

  const pkgRaw = await readText(path.join(root, "package.json"));
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string> };
      const scripts = pkg.scripts ?? {};
      const hasTestScript = Boolean(scripts.test);
      const hasLint =
        Boolean(scripts.lint) ||
        Boolean(scripts["lint:fix"]) ||
        Boolean(scripts.check);
      results.push({
        id: "ci.npm.test_script",
        category: "ci",
        title: "npm test script",
        severity: hasTestScript ? "pass" : "warn",
        weight: 2,
        message: hasTestScript
          ? "package.json defines a test script."
          : "package.json has no test script.",
      });
      results.push({
        id: "ci.npm.lint_script",
        category: "ci",
        title: "Lint / check script",
        severity: hasLint ? "pass" : "info",
        message: hasLint
          ? "A lint/check script is available."
          : "No lint/check script found.",
      });
    } catch {
      // packaging check covers parse errors
    }
  }

  return results;
}
