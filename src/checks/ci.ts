import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, listFiles } from "../fs.js";

export async function checkCi(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const files = await listFiles(root);

  const ghWorkflows = files.filter((f) =>
    f.startsWith(".github/workflows/") && /\.(yml|yaml)$/i.test(f),
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
      title: "CI workflows",
      severity: "pass",
      message: `Found GitHub Actions workflows: ${ghWorkflows.join(", ")}`,
    });
  } else if (foundOther.length > 0) {
    results.push({
      id: "ci.workflows",
      title: "CI workflows",
      severity: "pass",
      message: `Found CI config: ${foundOther.join(", ")}`,
    });
  } else {
    results.push({
      id: "ci.workflows",
      title: "CI workflows",
      severity: "warn",
      message: "No CI configuration detected.",
      hint: "Add a simple GitHub Actions workflow for install/build/test.",
    });
  }

  const hasTests =
    files.some((f) => /(^|\/)tests?\//i.test(f)) ||
    files.some((f) => /\.(test|spec)\.[jt]sx?$/i.test(f)) ||
    files.some((f) => /_test\.go$/i.test(f)) ||
    files.some((f) => /test_.*\.py$/i.test(f));

  results.push(
    hasTests
      ? {
          id: "ci.tests",
          title: "Automated tests",
          severity: "pass",
          message: "Test files or a tests directory were found.",
        }
      : {
          id: "ci.tests",
          title: "Automated tests",
          severity: "warn",
          message: "No obvious test files found.",
          hint: "Add at least a few unit tests for core behavior.",
        },
  );

  return results;
}
