import type { AuditOptions, CheckResult, Grade } from "./types.js";
import type { CategoryScore } from "./types.js";
import { checkDocs } from "./checks/docs.js";
import { checkLicense } from "./checks/license.js";
import { checkSecurity } from "./checks/security.js";
import { checkCi } from "./checks/ci.js";
import { checkPackaging } from "./checks/packaging.js";
import { checkCommunity } from "./checks/community.js";
import { scoreResults } from "./score.js";

export interface AuditReport {
  root: string;
  results: CheckResult[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
    info: number;
  };
  score: number;
  grade: Grade;
  categories: CategoryScore[];
}

export async function runAudit(options: AuditOptions): Promise<AuditReport> {
  const groups = await Promise.all([
    checkDocs(options.root),
    checkLicense(options.root),
    checkSecurity(options.root),
    checkCi(options.root),
    checkPackaging(options.root),
    checkCommunity(options.root),
  ]);

  const results = groups.flat();
  const summary = {
    pass: results.filter((r) => r.severity === "pass").length,
    warn: results.filter((r) => r.severity === "warn").length,
    fail: results.filter((r) => r.severity === "fail").length,
    info: results.filter((r) => r.severity === "info").length,
  };
  const scored = scoreResults(results);

  return {
    root: options.root,
    results,
    summary,
    score: scored.score,
    grade: scored.grade,
    categories: scored.categories,
  };
}

export function exitCodeFor(report: AuditReport, strict: boolean): number {
  if (report.summary.fail > 0) return 1;
  if (strict && report.summary.warn > 0) return 1;
  return 0;
}
