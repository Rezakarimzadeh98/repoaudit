import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, findFirst, readText } from "../fs.js";

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
      const hasProjectMetadata = /\[project\]/i.test(pyprojectRaw ?? "") || /\[tool\.poetry\]/i.test(pyprojectRaw ?? "");
      results.push({
        id: "packaging.python.pyproject",
        category: "packaging",
        title: "pyproject.toml metadata",
        severity: hasProjectMetadata ? "pass" : "info",
        message: hasProjectMetadata
          ? "pyproject.toml contains project metadata."
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
