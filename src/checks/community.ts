import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, findFirst, listFiles } from "../fs.js";

export async function checkCommunity(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const files = await listFiles(root);

  const contributing = await findFirst(root, [
    "CONTRIBUTING.md",
    "contributing.md",
    "docs/CONTRIBUTING.md",
    "docs/contributing.md",
    ".github/CONTRIBUTING.md",
    ".github/contributing.md",
  ]);
  results.push({
    id: "community.contributing",
    category: "community",
    title: "Contributing guide",
    severity: contributing ? "pass" : "warn",
    weight: 2,
    message: contributing
      ? `Found ${path.relative(root, contributing).replaceAll("\\", "/")}.`
      : "No CONTRIBUTING.md found.",
    hint: contributing
      ? undefined
      : "A short contributing guide makes first PRs much easier.",
  });

  const codeOfConduct = await findFirst(root, [
    "CODE_OF_CONDUCT.md",
    "code_of_conduct.md",
    ".github/CODE_OF_CONDUCT.md",
    ".github/code_of_conduct.md",
  ]);
  results.push({
    id: "community.code_of_conduct",
    category: "community",
    title: "Code of conduct",
    severity: codeOfConduct ? "pass" : "info",
    message: codeOfConduct
      ? "Code of conduct is present."
      : "No CODE_OF_CONDUCT.md found.",
  });

  const changelog = await findFirst(root, [
    "CHANGELOG.md",
    "changelog.md",
    "CHANGES.md",
    "changes.md",
    "HISTORY.md",
    "history.md",
  ]);
  results.push({
    id: "community.changelog",
    category: "community",
    title: "Changelog",
    severity: changelog ? "pass" : "info",
    message: changelog
      ? `Found ${path.basename(changelog)}.`
      : "No changelog file found.",
    hint: changelog
      ? undefined
      : "A CHANGELOG.md helps users track releases.",
  });

  const issueTemplates =
    (await exists(path.join(root, ".github", "ISSUE_TEMPLATE"))) ||
    (await exists(path.join(root, ".github", "issue_template"))) ||
    (await exists(path.join(root, ".github", "ISSUE_TEMPLATE.md"))) ||
    (await exists(path.join(root, ".github", "issue_template.md")));
  results.push({
    id: "community.issue_templates",
    category: "community",
    title: "Issue templates",
    severity: issueTemplates ? "pass" : "warn",
    weight: 1,
    message: issueTemplates
      ? "Issue templates are present."
      : "No issue templates found.",
    hint: issueTemplates
      ? undefined
      : "Templates reduce incomplete bug reports.",
  });

  const prTemplate =
    (await exists(path.join(root, ".github", "PULL_REQUEST_TEMPLATE.md"))) ||
    (await exists(path.join(root, ".github", "pull_request_template.md"))) ||
    (await exists(
      path.join(root, ".github", "PULL_REQUEST_TEMPLATE", "pull_request_template.md"),
    )) ||
    files.some(
      (file) =>
        file.startsWith(".github/PULL_REQUEST_TEMPLATE/") ||
        file.startsWith(".github/pull_request_template/"),
    );
  results.push({
    id: "community.pr_template",
    category: "community",
    title: "PR template",
    severity: prTemplate ? "pass" : "info",
    message: prTemplate
      ? "Pull request template is present."
      : "No pull request template found.",
  });

  const funding =
    (await exists(path.join(root, ".github", "FUNDING.yml"))) ||
    (await exists(path.join(root, ".github", "funding.yml"))) ||
    (await exists(path.join(root, "FUNDING.yml"))) ||
    (await exists(path.join(root, "funding.yml")));
  results.push({
    id: "community.funding",
    category: "community",
    title: "Funding",
    severity: funding ? "pass" : "info",
    message: funding ? "Funding config found." : "No FUNDING.yml found.",
  });

  return results;
}
