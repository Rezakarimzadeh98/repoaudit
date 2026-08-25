import type { AuditOptions, CheckResult, Grade } from "./types.js";
import type { CategoryScore } from "./types.js";
import { checkDocs } from "./checks/docs.js";
import { checkLicense } from "./checks/license.js";
import { checkSecurity } from "./checks/security.js";
import { checkCi } from "./checks/ci.js";
import { checkPackaging } from "./checks/packaging.js";
import { checkCommunity } from "./checks/community.js";
import { loadRepoAuditConfig } from "./config.js";
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
  const config = await loadRepoAuditConfig(options.root);

  const groups = await Promise.all([
    checkDocs(options.root),
    checkLicense(options.root),
    checkSecurity(options.root),
    checkCi(options.root),
    checkPackaging(options.root),
    checkCommunity(options.root),
  ]);

  let results = groups.flat();

  if (config.disabledChecks?.length) {
    const disabled = new Set(config.disabledChecks);
    results = results.filter((result) => !disabled.has(result.id));
  }

  if (config.weights) {
    results = results.map((result) => {
      const weight = config.weights?.[result.id];
      return typeof weight === "number" ? { ...result, weight } : result;
    });
  }

  if (config.strictCategories?.length) {
    const strictCategories = new Set(config.strictCategories);
    results = results.map((result) =>
      result.severity === "warn" && strictCategories.has(result.category)
        ? {
            ...result,
            severity: "fail",
            hint:
              result.hint ??
              "This warning was promoted to fail by .repoauditrc.json strictCategories.",
          }
        : result,
    );
  }

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
