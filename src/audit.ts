import type { AuditOptions, CheckResult } from "./types.js";
import { checkDocs } from "./checks/docs.js";
import { checkLicense } from "./checks/license.js";
import { checkSecurity } from "./checks/security.js";
import { checkCi } from "./checks/ci.js";
import { checkMetadata } from "./checks/metadata.js";

export interface AuditReport {
  root: string;
  results: CheckResult[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
    info: number;
  };
}

export async function runAudit(options: AuditOptions): Promise<AuditReport> {
  const groups = await Promise.all([
    checkDocs(options.root),
    checkLicense(options.root),
    checkSecurity(options.root),
    checkCi(options.root),
    checkMetadata(options.root),
  ]);

  const results = groups.flat();
  const summary = {
    pass: results.filter((r) => r.severity === "pass").length,
    warn: results.filter((r) => r.severity === "warn").length,
    fail: results.filter((r) => r.severity === "fail").length,
    info: results.filter((r) => r.severity === "info").length,
  };

  return { root: options.root, results, summary };
}

export function exitCodeFor(report: AuditReport, strict: boolean): number {
  if (report.summary.fail > 0) return 1;
  if (strict && report.summary.warn > 0) return 1;
  return 0;
}
