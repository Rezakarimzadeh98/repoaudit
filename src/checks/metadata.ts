import path from "node:path";
import type { CheckResult } from "../types.js";
import { exists, readText } from "../fs.js";

export async function checkMetadata(root: string): Promise<CheckResult[]> {
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
      };

      results.push(
        pkg.description && pkg.description.trim().length > 0
          ? {
              id: "meta.npm.description",
              title: "package.json description",
              severity: "pass",
              message: "package.json has a description.",
            }
          : {
              id: "meta.npm.description",
              title: "package.json description",
              severity: "warn",
              message: "package.json is missing a description.",
            },
      );

      results.push(
        pkg.license
          ? {
              id: "meta.npm.license",
              title: "package.json license",
              severity: "pass",
              message: `package.json license: ${pkg.license}`,
            }
          : {
              id: "meta.npm.license",
              title: "package.json license",
              severity: "warn",
              message: "package.json has no license field.",
            },
      );

      const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
      results.push(
        keywords.length >= 3
          ? {
              id: "meta.npm.keywords",
              title: "package.json keywords",
              severity: "pass",
              message: `Found ${keywords.length} keywords.`,
            }
          : {
              id: "meta.npm.keywords",
              title: "package.json keywords",
              severity: "info",
              message: "Add a few keywords to improve discoverability.",
            },
      );
    } catch {
      results.push({
        id: "meta.npm.parse",
        title: "package.json",
        severity: "fail",
        message: "package.json exists but could not be parsed as JSON.",
      });
    }
  }

  const pyproject = path.join(root, "pyproject.toml");
  const setupPy = path.join(root, "setup.py");
  if ((await exists(pyproject)) || (await exists(setupPy))) {
    results.push({
      id: "meta.python.packaging",
      title: "Python packaging",
      severity: "pass",
      message: (await exists(pyproject))
        ? "Found pyproject.toml."
        : "Found setup.py.",
    });
  }

  const editorconfig = path.join(root, ".editorconfig");
  results.push(
    (await exists(editorconfig))
      ? {
          id: "meta.editorconfig",
          title: "EditorConfig",
          severity: "pass",
          message: ".editorconfig is present.",
        }
      : {
          id: "meta.editorconfig",
          title: "EditorConfig",
          severity: "info",
          message: "No .editorconfig found.",
        },
  );

  return results;
}
