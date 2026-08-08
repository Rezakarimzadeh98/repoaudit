import path from "node:path";
import type { CheckResult } from "../types.js";
import { findFirst, readText } from "../fs.js";

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "COPYING",
  "COPYING.md",
];

export async function checkLicense(root: string): Promise<CheckResult[]> {
  const licensePath = await findFirst(root, LICENSE_NAMES);
  if (!licensePath) {
    return [
      {
        id: "license.file",
        title: "License file",
        severity: "fail",
        message: "No LICENSE file found.",
        hint: "Add an OSI-approved license (MIT, Apache-2.0, etc.) in the repository root.",
      },
    ];
  }

  const text = ((await readText(licensePath)) ?? "").toLowerCase();
  let kind = "unknown";
  if (text.includes("mit license") || text.includes("permission is hereby granted, free of charge")) {
    kind = "MIT";
  } else if (text.includes("apache license") && text.includes("version 2.0")) {
    kind = "Apache-2.0";
  } else if (text.includes("gnu general public license") && text.includes("version 3")) {
    kind = "GPL-3.0";
  } else if (text.includes("bsd 3-clause")) {
    kind = "BSD-3-Clause";
  }

  return [
    {
      id: "license.file",
      title: "License file",
      severity: "pass",
      message:
        kind === "unknown"
          ? `Found ${path.basename(licensePath)}.`
          : `Found ${path.basename(licensePath)} (${kind}).`,
    },
  ];
}
