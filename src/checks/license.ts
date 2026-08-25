import path from "node:path";
import parseSpdx from "spdx-expression-parse";
import type { CheckResult } from "../types.js";
import { findFirst, listFiles, readText } from "../fs.js";

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "COPYING",
  "COPYING.md",
];

function isValidSpdxExpression(value: string): boolean {
  try {
    parseSpdx(value);
    return true;
  } catch {
    return false;
  }
}

function pickSpdxFromPackageJson(pkg: unknown): string | null {
  if (!pkg || typeof pkg !== "object") return null;

  const licenseField = (pkg as Record<string, unknown>).license;
  if (typeof licenseField === "string") {
    return licenseField.trim() || null;
  }

  if (licenseField && typeof licenseField === "object") {
    const typeField = (licenseField as Record<string, unknown>).type;
    if (typeof typeField === "string") {
      return typeField.trim() || null;
    }
  }

  return null;
}

export async function checkLicense(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const pkgPath = path.join(root, "package.json");
  const pkgRaw = await readText(pkgPath);
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as unknown;
      const spdx = pickSpdxFromPackageJson(pkg);
      if (!spdx) {
        results.push({
          id: "license.spdx.package",
          category: "license",
          title: "SPDX in package.json",
          severity: "warn",
          weight: 1,
          message: "package.json is missing a license SPDX expression.",
          hint: 'Set package.json license to a valid SPDX expression such as "MIT" or "Apache-2.0".',
        });
      } else if (!isValidSpdxExpression(spdx)) {
        results.push({
          id: "license.spdx.package",
          category: "license",
          title: "SPDX in package.json",
          severity: "warn",
          weight: 1,
          message: `package.json license is not a valid SPDX expression: ${spdx}`,
          hint: "Use a valid SPDX identifier/expression (for example MIT, Apache-2.0, MIT OR Apache-2.0).",
        });
      } else {
        results.push({
          id: "license.spdx.package",
          category: "license",
          title: "SPDX in package.json",
          severity: "pass",
          weight: 1,
          message: `Valid SPDX expression found in package.json: ${spdx}`,
        });
      }
    } catch {
      results.push({
        id: "license.spdx.package",
        category: "license",
        title: "SPDX in package.json",
        severity: "warn",
        weight: 1,
        message: "package.json could not be parsed while checking SPDX license.",
      });
    }
  }

  const sourceFiles = (await listFiles(root)).filter((file) =>
    /\.(ts|tsx|js|jsx|mts|cts|py|go|rs|java|cs|cpp|c|h|hpp|sh|ps1|rb|php)$/i.test(
      file,
    ),
  );

  const headerCandidates = sourceFiles.slice(0, 200);
  let headerFound: string | null = null;
  for (const rel of headerCandidates) {
    const content = await readText(path.join(root, rel));
    if (!content) continue;
    const line = content.split(/\r?\n/, 20).find((l) =>
      /SPDX-License-Identifier:/i.test(l),
    );
    if (!line) continue;
    const match = line.match(/SPDX-License-Identifier:\s*(.+)\s*$/i);
    if (match?.[1]) {
      headerFound = match[1].trim();
      break;
    }
  }

  if (headerFound) {
    if (isValidSpdxExpression(headerFound)) {
      results.push({
        id: "license.spdx.header",
        category: "license",
        title: "SPDX header in source files",
        severity: "pass",
        message: `Found SPDX-License-Identifier header: ${headerFound}`,
      });
    } else {
      results.push({
        id: "license.spdx.header",
        category: "license",
        title: "SPDX header in source files",
        severity: "warn",
        message: `Found SPDX-License-Identifier header with invalid SPDX expression: ${headerFound}`,
        hint: "Use a valid SPDX identifier in source headers (for example SPDX-License-Identifier: MIT).",
      });
    }
  }

  const licensePath = await findFirst(root, LICENSE_NAMES);
  if (!licensePath) {
    results.push({
      id: "license.file",
      category: "license",
      title: "License file",
      severity: "fail",
      weight: 3,
      message: "No LICENSE file found.",
      hint: "Add an OSI-approved license (MIT, Apache-2.0, etc.) in the repository root.",
    });
    return results;
  }

  const text = ((await readText(licensePath)) ?? "").toLowerCase();
  let kind = "unknown";
  if (
    text.includes("mit license") ||
    text.includes("permission is hereby granted, free of charge")
  ) {
    kind = "MIT";
  } else if (text.includes("apache license") && text.includes("version 2.0")) {
    kind = "Apache-2.0";
  } else if (
    text.includes("gnu general public license") &&
    text.includes("version 3")
  ) {
    kind = "GPL-3.0";
  } else if (text.includes("bsd 3-clause")) {
    kind = "BSD-3-Clause";
  }

  results.push({
    id: "license.file",
    category: "license",
    title: "License file",
    severity: "pass",
    weight: 3,
    message:
      kind === "unknown"
        ? `Found ${path.basename(licensePath)}.`
        : `Found ${path.basename(licensePath)} (${kind}).`,
  });

  return results;
}
