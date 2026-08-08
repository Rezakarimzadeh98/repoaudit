export type Severity = "pass" | "warn" | "fail" | "info";

export interface CheckResult {
  id: string;
  title: string;
  severity: Severity;
  message: string;
  hint?: string;
}

export interface AuditOptions {
  root: string;
  json: boolean;
  strict: boolean;
}
