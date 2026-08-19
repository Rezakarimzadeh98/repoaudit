import path from "node:path";
import type { CheckResult } from "../types.js";
import { findFirst, readText, listFiles } from "../fs.js";
import { isValidSpdxExpression } from "../spdx.js";

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "COPYING",
  "COPYING.md",
];

const SOURCE_FILE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
  ".java", ".kt", ".rb", ".php", ".sh"
]);

export async function checkLicense(root: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

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
  } else {
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
  }

  // Scan source files for SPDX headers
  const files = await listFiles(root);
  const sourceFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SOURCE_FILE_EXTENSIONS.has(ext);
  });

  const detected: { file: string; spdx: string }[] = [];
  const invalid: { file: string; spdx: string }[] = [];

  for (const file of sourceFiles) {
    const filePath = path.join(root, file);
    const content = await readText(filePath);
    if (!content) continue;
    // Inspect first 1000 characters
    const chunk = content.slice(0, 1000);
    // Find SPDX header
    const match = chunk.match(/SPDX-License-Identifier:\s*([a-zA-Z0-9.\-_+() ]+?)(?=\s*(?:\*\/|\r|\n|$))/i);
    if (match) {
      const spdx = match[1].trim();
      if (isValidSpdxExpression(spdx)) {
        detected.push({ file, spdx });
      } else {
        invalid.push({ file, spdx });
      }
    }
  }

  if (invalid.length > 0) {
    const uniqueInvalid = Array.from(new Set(invalid.map((i) => i.spdx)));
    results.push({
      id: "license.spdx",
      category: "license",
      title: "SPDX license headers",
      severity: "warn",
      weight: 1,
      message: `Found invalid SPDX headers in source files: ${uniqueInvalid.join(", ")}`,
      hint: "Ensure your source file SPDX headers use valid SPDX identifiers (e.g., MIT, Apache-2.0).",
    });
  } else if (detected.length > 0) {
    const uniqueDetected = Array.from(new Set(detected.map((d) => d.spdx)));
    results.push({
      id: "license.spdx",
      category: "license",
      title: "SPDX license headers",
      severity: "pass",
      weight: 1,
      message: `Found valid SPDX headers: ${uniqueDetected.join(", ")}`,
    });
  }

  return results;
}

