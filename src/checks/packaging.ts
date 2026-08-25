import path from "node:path";
import { parse as parseToml } from "@iarna/toml";
import type { CheckResult } from "../types.js";
import { exists, findFirst, readText } from "../fs.js";

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getPath(obj: unknown, pathParts: string[]): unknown {
  let current: unknown = obj;
  for (const part of pathParts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export async function checkPackaging(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const pkgPath = path.join(root, "package.json");
  if (await exists(pkgPath)) {
    const raw = await readText(pkgPath);
    try {
      const pkg = JSON.parse(raw ?? "{}") as {
        name?: string;
        description?: string;
        license?: string;
        repository?: unknown;
        keywords?: unknown;
        engines?: unknown;
        files?: unknown;
        bin?: unknown;
        main?: unknown;
        exports?: unknown;
        type?: string;
      };

      results.push({
        id: "packaging.npm.description",
        category: "packaging",
        title: "package.json description",
        severity:
          pkg.description && pkg.description.trim().length > 0
            ? "pass"
            : "warn",
        weight: 2,
        message:
          pkg.description && pkg.description.trim().length > 0
            ? "package.json has a description."
            : "package.json is missing a description.",
      });

      results.push({
        id: "packaging.npm.license",
        category: "packaging",
        title: "package.json license",
        severity: pkg.license ? "pass" : "warn",
        weight: 2,
        message: pkg.license
          ? `package.json license: ${pkg.license}`
          : "package.json has no license field.",
      });

      const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
      results.push({
        id: "packaging.npm.keywords",
        category: "packaging",
        title: "Discoverability keywords",
        severity: keywords.length >= 3 ? "pass" : "info",
        message:
          keywords.length >= 3
            ? `Found ${keywords.length} keywords.`
            : "Add a few keywords to improve discoverability.",
      });

      results.push({
        id: "packaging.npm.repository",
        category: "packaging",
        title: "repository field",
        severity: pkg.repository ? "pass" : "warn",
        weight: 1,
        message: pkg.repository
          ? "package.json links back to the repository."
          : "package.json has no repository field.",
        hint: pkg.repository
          ? undefined
          : "Set repository.url so npm users can find the source.",
      });

      const hasEntry = Boolean(pkg.main || pkg.exports || pkg.bin);
      results.push({
        id: "packaging.npm.entry",
        category: "packaging",
        title: "Package entrypoints",
        severity: hasEntry ? "pass" : "info",
        message: hasEntry
          ? "Entrypoint/bin fields are defined."
          : "No main/exports/bin fields found.",
      });

      const lockfile = await findFirst(root, [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "bun.lockb",
      ]);
      results.push({
        id: "packaging.lockfile",
        category: "packaging",
        title: "Lockfile",
        severity: lockfile ? "pass" : "warn",
        weight: 1,
        message: lockfile
          ? `Found ${path.basename(lockfile)}.`
          : "No JS lockfile found.",
        hint: lockfile
          ? undefined
          : "Commit a lockfile for reproducible installs.",
      });
    } catch {
      results.push({
        id: "packaging.npm.parse",
        category: "packaging",
        title: "package.json",
        severity: "fail",
        weight: 2,
        message: "package.json exists but could not be parsed as JSON.",
      });
    }
  }

  const hasPythonPackaging =
    (await exists(path.join(root, "pyproject.toml"))) ||
    (await exists(path.join(root, "setup.py"))) ||
    (await exists(path.join(root, "requirements.txt")));

  if (hasPythonPackaging) {
    results.push({
      id: "packaging.python",
      category: "packaging",
      title: "Python packaging",
      severity: "pass",
      weight: 1,
      message: "Python packaging/dependency files detected.",
    });

    const pyprojectPath = path.join(root, "pyproject.toml");
    if (await exists(pyprojectPath)) {
      const pyprojectRaw = await readText(pyprojectPath);
      const raw = pyprojectRaw ?? "";
      try {
        const parsed = parseToml(raw) as Record<string, unknown>;
        const hasProjectSection =
          typeof getPath(parsed, ["project"]) === "object" &&
          getPath(parsed, ["project"]) !== null;
        const hasPoetrySection =
          typeof getPath(parsed, ["tool", "poetry"]) === "object" &&
          getPath(parsed, ["tool", "poetry"]) !== null;

        let source = "unknown";
        if (hasProjectSection && hasPoetrySection) {
          source = "mixed";
        } else if (hasProjectSection) {
          source = "pep621";
        } else if (hasPoetrySection) {
          source = "poetry";
        }

        const sourceLabel =
          source === "pep621"
            ? "PEP 621 ([project])"
            : source === "poetry"
              ? "Poetry ([tool.poetry])"
              : source === "mixed"
                ? "Mixed ([project] + [tool.poetry])"
                : "Unknown";

        const projectName =
          pickString(getPath(parsed, ["project", "name"])) ||
          pickString(getPath(parsed, ["tool", "poetry", "name"]));
        const projectDescription =
          pickString(getPath(parsed, ["project", "description"])) ||
          pickString(getPath(parsed, ["tool", "poetry", "description"]));

        const projectLicense =
          pickString(getPath(parsed, ["project", "license"])) ||
          pickString(getPath(parsed, ["project", "license", "text"])) ||
          pickString(getPath(parsed, ["project", "license", "file"])) ||
          pickString(getPath(parsed, ["tool", "poetry", "license"]));

        const requiresPython =
          pickString(getPath(parsed, ["project", "requires-python"])) ||
          pickString(getPath(parsed, ["tool", "poetry", "dependencies", "python"]));

        const readme =
          pickString(getPath(parsed, ["project", "readme"])) ||
          pickString(getPath(parsed, ["tool", "poetry", "readme"]));

        const requiredChecks = [
          { id: "name", value: projectName },
          { id: "description", value: projectDescription },
          { id: "license", value: projectLicense },
          { id: "requires-python", value: requiresPython },
        ];

        const missingRequired = requiredChecks
          .filter((item) => !item.value)
          .map((item) => item.id);

        const score = requiredChecks.filter((item) => item.value).length + (readme ? 1 : 0);
        const severity = missingRequired.length === 0 ? "pass" : "warn";
        const message =
          missingRequired.length === 0
            ? readme
              ? `pyproject.toml metadata is complete (${score}/5 checks: required fields + readme). Source: ${sourceLabel}.`
              : `pyproject.toml has required metadata but is missing optional readme reference (4/5 checks). Source: ${sourceLabel}.`
            : `pyproject.toml is missing required metadata field(s): ${missingRequired.join(", ")}. Source: ${sourceLabel}.`;

        results.push({
          id: "packaging.python.pyproject",
          category: "packaging",
          title: "pyproject.toml metadata",
          severity,
          message,
          hint:
            missingRequired.length > 0
              ? "For PEP 621 use [project] fields. For Poetry use [tool.poetry] and [tool.poetry.dependencies.python]."
              : undefined,
        });
      } catch {
        results.push({
          id: "packaging.python.pyproject",
          category: "packaging",
          title: "pyproject.toml metadata",
          severity: "fail",
          message: "pyproject.toml could not be parsed.",
          hint: "Validate TOML syntax and try again.",
        });
      }
    }
  }

  if (await exists(path.join(root, "Cargo.toml"))) {
    results.push({
      id: "packaging.rust",
      category: "packaging",
      title: "Rust packaging",
      severity: "pass",
      weight: 1,
      message: "Found Cargo.toml.",
    });
  }

  if (await exists(path.join(root, "go.mod"))) {
    results.push({
      id: "packaging.go",
      category: "packaging",
      title: "Go module",
      severity: "pass",
      weight: 1,
      message: "Found go.mod.",
    });
  }

  const editorconfig = path.join(root, ".editorconfig");
  results.push({
    id: "packaging.editorconfig",
    category: "packaging",
    title: "EditorConfig",
    severity: (await exists(editorconfig)) ? "pass" : "info",
    message: (await exists(editorconfig))
      ? ".editorconfig is present."
      : "No .editorconfig found.",
  });

  const dockerfile = await findFirst(root, [
    "Dockerfile",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
  ]);
  results.push({
    id: "packaging.container",
    category: "packaging",
    title: "Container config",
    severity: dockerfile ? "pass" : "info",
    message: dockerfile
      ? `Found ${path.basename(dockerfile)}.`
      : "No Dockerfile/compose file found.",
  });

  return results;
}
