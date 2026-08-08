export type Severity = "pass" | "warn" | "fail" | "info";

export type Category =
  | "docs"
  | "license"
  | "security"
  | "ci"
  | "packaging"
  | "community";

export interface CheckResult {
  id: string;
  category: Category;
  title: string;
  severity: Severity;
  message: string;
  hint?: string;
  /** Weight used for score. Fail/warn/pass affect category score. */
  weight?: number;
}

export interface AuditOptions {
  root: string;
  json: boolean;
  markdown: boolean;
  strict: boolean;
  noColor: boolean;
}

export interface CategoryScore {
  category: Category;
  score: number;
  pass: number;
  warn: number;
  fail: number;
  info: number;
}

export type Grade = "A" | "B" | "C" | "D" | "F";
