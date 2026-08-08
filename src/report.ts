import type { AuditReport } from "./audit.js";
import type { Severity } from "./types.js";

const ICON: Record<Severity, string> = {
  pass: "[PASS]",
  warn: "[WARN]",
  fail: "[FAIL]",
  info: "[INFO]",
};

export function formatText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`RepoAudit — ${report.root}`);
  lines.push("=".repeat(48));

  for (const item of report.results) {
    lines.push(`${ICON[item.severity]} ${item.title}`);
    lines.push(`       ${item.message}`);
    if (item.hint && item.severity !== "pass") {
      lines.push(`       hint: ${item.hint}`);
    }
  }

  lines.push("=".repeat(48));
  lines.push(
    `Summary: ${report.summary.pass} pass · ${report.summary.warn} warn · ${report.summary.fail} fail · ${report.summary.info} info`,
  );

  if (report.summary.fail === 0 && report.summary.warn === 0) {
    lines.push("Looks solid. Ready to share.");
  } else if (report.summary.fail === 0) {
    lines.push("No hard failures. Tighten warnings before a public launch.");
  } else {
    lines.push("Fix the FAIL items before publishing.");
  }

  return lines.join("\n");
}

export function formatJson(report: AuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
