import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, findFirst, readText } from "../fs.js";

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
      title: "README",
      severity: "fail",
      message: "No README file found in the repository root.",
      hint: "Add README.md with install steps, usage, and a short project pitch.",
    });
  } else {
    const text = (await readText(readme)) ?? "";
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 8) {
      results.push({
        id: "docs.readme",
        title: "README",
        severity: "warn",
        message: `Found ${path.basename(readme)}, but it looks too short.`,
        hint: "Expand it with install, usage examples, and contribution notes.",
      });
    } else {
      results.push({
        id: "docs.readme",
        title: "README",
        severity: "pass",
        message: `Found ${path.basename(readme)}.`,
      });
    }

    const lower = text.toLowerCase();
    if (!/(install|usage|getting started|quick start)/i.test(lower)) {
      results.push({
        id: "docs.readme.usage",
        title: "README usage section",
        severity: "warn",
        message: "README does not clearly describe install/usage.",
        hint: "Add a short Install and Usage section with copy-pasteable commands.",
      });
    } else {
      results.push({
        id: "docs.readme.usage",
        title: "README usage section",
        severity: "pass",
        message: "README includes install/usage guidance.",
      });
    }
  }

  const contributing = await findFirst(root, [
    "CONTRIBUTING.md",
    "docs/CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
  ]);
  results.push(
    contributing
      ? {
          id: "docs.contributing",
          title: "Contributing guide",
          severity: "pass",
          message: `Found ${path.relative(root, contributing).replaceAll("\\", "/")}.`,
        }
      : {
          id: "docs.contributing",
          title: "Contributing guide",
          severity: "info",
          message: "No CONTRIBUTING.md found.",
          hint: "Optional, but useful if you want pull requests from others.",
        },
  );

  const codeOfConduct = await findFirst(root, [
    "CODE_OF_CONDUCT.md",
    ".github/CODE_OF_CONDUCT.md",
  ]);
  results.push(
    codeOfConduct
      ? {
          id: "docs.code_of_conduct",
          title: "Code of conduct",
          severity: "pass",
          message: "Code of conduct is present.",
        }
      : {
          id: "docs.code_of_conduct",
          title: "Code of conduct",
          severity: "info",
          message: "No CODE_OF_CONDUCT.md found.",
        },
  );

  const changelog = await findFirst(root, [
    "CHANGELOG.md",
    "CHANGES.md",
    "HISTORY.md",
  ]);
  results.push(
    changelog
      ? {
          id: "docs.changelog",
          title: "Changelog",
          severity: "pass",
          message: `Found ${path.basename(changelog)}.`,
        }
      : {
          id: "docs.changelog",
          title: "Changelog",
          severity: "info",
          message: "No changelog file found.",
          hint: "A CHANGELOG.md helps users track releases.",
        },
  );

  if (await exists(path.join(root, ".github", "ISSUE_TEMPLATE"))) {
    results.push({
      id: "docs.issue_templates",
      title: "Issue templates",
      severity: "pass",
      message: "Issue templates directory exists.",
    });
  } else {
    results.push({
      id: "docs.issue_templates",
      title: "Issue templates",
      severity: "info",
      message: "No .github/ISSUE_TEMPLATE directory found.",
    });
  }

  return results;
}
