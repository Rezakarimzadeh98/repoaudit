import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, findFirst, readText } from "../fs.js";
import { isValidSpdxExpression } from "../spdx.js";

function extractLicenseStrings(license: any): string[] {
  if (!license) return [];
  if (typeof license === "string") {
    return [license];
  }
  if (Array.isArray(license)) {
    const list: string[] = [];
    for (const item of license) {
      list.push(...extractLicenseStrings(item));
    }
    return list;
  }
  if (typeof license === "object") {
    if (typeof license.type === "string") {
      return [license.type];
    }
  }
  return [];
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
        license?: any;
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

      const licenseStrings = extractLicenseStrings(pkg.license);
      let licenseSeverity: "pass" | "warn" = "warn";
      let licenseMessage = "";
      let licenseHint: string | undefined;

      if (!pkg.license) {
        licenseMessage = "package.json has no license field.";
        licenseHint = "Add a valid SPDX license identifier (e.g., 'MIT', 'Apache-2.0') to the package.json license field.";
      } else if (licenseStrings.length === 0) {
        licenseMessage = "package.json license field is invalid or empty.";
        licenseHint = "Ensure the license field is a valid SPDX identifier (like 'MIT') or expression (like 'MIT OR Apache-2.0').";
      } else {
        const invalidLicenses = licenseStrings.filter(l => !isValidSpdxExpression(l, { allowNpmConventions: true }));
        if (invalidLicenses.length > 0) {
          licenseMessage = `package.json license '${licenseStrings.join(", ")}' is not a valid SPDX expression.`;
          licenseHint = "Ensure the license field is a valid SPDX identifier (like 'MIT' or 'Apache-2.0') or expression (like 'MIT OR Apache-2.0').";
        } else {
          licenseSeverity = "pass";
          licenseMessage = `package.json license: ${licenseStrings.join(", ")}`;
        }
      }

      results.push({
        id: "packaging.npm.license",
        category: "packaging",
        title: "package.json license",
        severity: licenseSeverity,
        weight: 2,
        message: licenseMessage,
        hint: licenseHint,
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
      const indicators = [
        /\[(project|tool\.poetry)\]/i.test(raw),
        /^\s*name\s*=.*$/im.test(raw),
        /^\s*version\s*=.*$/im.test(raw),
        /^\s*dependencies\s*=.*$/im.test(raw),
        /\[build-system\]/i.test(raw),
      ];
      const score = indicators.filter(Boolean).length;
      const hasProjectMetadata = score >= 3;
      results.push({
        id: "packaging.python.pyproject",
        category: "packaging",
        title: "pyproject.toml metadata",
        severity: score >= 5 ? "pass" : hasProjectMetadata ? "info" : "info",
        message: hasProjectMetadata
          ? `pyproject.toml contains project metadata (${score}/5 indicators).`
          : "pyproject.toml found but no project metadata section was detected.",
      });
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
