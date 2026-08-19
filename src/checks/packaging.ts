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

      const fields = extractPyprojectFields(raw);

      // Name Check
      const hasName = fields.name && fields.name.trim().length > 0;
      results.push({
        id: "packaging.python.name",
        category: "packaging",
        title: "pyproject.toml name",
        severity: hasName ? "pass" : "fail",
        weight: 2,
        message: hasName
          ? `pyproject.toml project name: ${fields.name}`
          : "pyproject.toml is missing project name.",
        hint: hasName ? undefined : "Add a 'name' field under the [project] table in pyproject.toml.",
      });

      // Description Check
      const hasDesc = fields.description && fields.description.trim().length > 0;
      results.push({
        id: "packaging.python.description",
        category: "packaging",
        title: "pyproject.toml description",
        severity: hasDesc ? "pass" : "warn",
        weight: 2,
        message: hasDesc
          ? "pyproject.toml has a description."
          : "pyproject.toml is missing a description.",
        hint: hasDesc ? undefined : "Add a 'description' field under the [project] table in pyproject.toml to describe your package.",
      });

      // License Check
      const hasLicense = fields.license && fields.license.trim().length > 0;
      results.push({
        id: "packaging.python.license",
        category: "packaging",
        title: "pyproject.toml license",
        severity: hasLicense ? "pass" : "warn",
        weight: 2,
        message: hasLicense
          ? `pyproject.toml license: ${fields.license}`
          : "pyproject.toml has no license defined.",
        hint: hasLicense ? undefined : "Specify a license under the [project] table (e.g. license = 'MIT' or license = { text = 'MIT' }) in pyproject.toml.",
      });

      // Requires-Python Check
      const hasRequires = fields.requiresPython && fields.requiresPython.trim().length > 0;
      results.push({
        id: "packaging.python.requires_python",
        category: "packaging",
        title: "pyproject.toml requires-python",
        severity: hasRequires ? "pass" : "warn",
        weight: 2,
        message: hasRequires
          ? `pyproject.toml requires-python: ${fields.requiresPython}`
          : "pyproject.toml is missing requires-python target.",
        hint: hasRequires ? undefined : "Add a 'requires-python' field under [project] table (e.g. requires-python = '>=3.8') to state compatible Python versions.",
      });

      // Readme Check
      const hasReadme = fields.readme && fields.readme.trim().length > 0;
      results.push({
        id: "packaging.python.readme",
        category: "packaging",
        title: "pyproject.toml readme reference",
        severity: hasReadme ? "pass" : "info",
        message: hasReadme
          ? `pyproject.toml readme reference: ${fields.readme}`
          : "pyproject.toml has no readme reference.",
        hint: hasReadme ? undefined : "Add a 'readme' field under [project] table pointing to your README file so PyPI can show package documentation.",
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

interface PyprojectFields {
  name?: string;
  description?: string;
  license?: string;
  requiresPython?: string;
  readme?: string;
}

function extractPyprojectFields(raw: string): PyprojectFields {
  const lines = raw.split(/\r?\n/);
  let currentSection = "";
  
  const fields: PyprojectFields = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    // Table header check: e.g. [project] or [tool.poetry]
    const sectionMatch = line.match(/^\[+([^\]]+)\]+/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    // Key-value pair check: e.g. key = value
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim().toLowerCase();
      let value = line.slice(eqIdx + 1).trim();

      // Clean value (strip outer quotes or comments)
      value = stripTrailingComment(value);

      // Handle simple string extraction
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      let fullKey = key;
      let targetSection = currentSection;
      if (key.includes(".")) {
        const parts = key.split(".");
        fullKey = parts.pop()!;
        targetSection = parts.join(".");
      }

      if (targetSection === "project") {
        if (fullKey === "name") fields.name = value;
        else if (fullKey === "description") fields.description = value;
        else if (fullKey === "requires-python") fields.requiresPython = value;
        else if (fullKey === "license") {
          if (value.startsWith("{") && value.endsWith("}")) {
            const parsed = parseInlineTable(value);
            fields.license = parsed.text || parsed.file;
          } else {
            fields.license = value;
          }
        }
        else if (fullKey === "readme") {
          if (value.startsWith("{") && value.endsWith("}")) {
            const parsed = parseInlineTable(value);
            fields.readme = parsed.file || parsed.text;
          } else {
            fields.readme = value;
          }
        }
      } else if (targetSection === "tool.poetry") {
        if (fullKey === "name") fields.name = value;
        else if (fullKey === "description") fields.description = value;
        else if (fullKey === "license") fields.license = value;
        else if (fullKey === "readme") {
          if (value.startsWith("{") && value.endsWith("}")) {
            const parsed = parseInlineTable(value);
            fields.readme = parsed.file || parsed.text;
          } else {
            fields.readme = value;
          }
        }
      } else if (targetSection === "tool.poetry.dependencies") {
        if (fullKey === "python") {
          fields.requiresPython = value;
        }
      }
    }
  }

  return fields;
}

function stripTrailingComment(val: string): string {
  let inDoubleQuote = false;
  let inSingleQuote = false;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
    else if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    else if (char === "#" && !inDoubleQuote && !inSingleQuote) {
      return val.slice(0, i).trim();
    }
  }
  return val;
}

function parseInlineTable(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const inner = content.slice(1, -1);
  const pairs = inner.split(",");
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const key = pair.slice(0, eqIdx).trim().toLowerCase();
      let valStr = pair.slice(eqIdx + 1).trim();
      if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
        valStr = valStr.slice(1, -1);
      }
      result[key] = valStr;
    }
  }
  return result;
}
