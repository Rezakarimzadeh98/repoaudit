import type { AuditReport } from "./audit.js";
import type { Category, Severity } from "./types.js";

const CATEGORY_LABEL: Record<Category, string> = {
  docs: "Docs",
  license: "License",
  security: "Security",
  ci: "CI & Tests",
  packaging: "Packaging",
  community: "Community",
};

function supportsColor(forcedOff: boolean): boolean {
  if (forcedOff) return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  return Boolean(process.stdout.isTTY);
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

const SEVERITY_STYLE: Record<
  Severity,
  { label: string; code: string }
> = {
  pass: { label: "PASS", code: "32" },
  warn: { label: "WARN", code: "33" },
  fail: { label: "FAIL", code: "31" },
  info: { label: "INFO", code: "36" },
};

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function formatText(report: AuditReport, noColor = false): string {
  const color = supportsColor(noColor);
  const lines: string[] = [];

  lines.push(paint(color, "1", "repoaudit"));
  lines.push(`path   ${report.root}`);
  lines.push(
    `score  ${paint(color, "1", `${report.score}/100`)}  grade ${paint(
      color,
      report.grade === "A" || report.grade === "B" ? "32" : report.grade === "C" ? "33" : "31",
      report.grade,
    )}`,
  );
  lines.push("");

  for (const category of report.categories) {
    lines.push(
      `${CATEGORY_LABEL[category.category].padEnd(12)} ${String(category.score).padStart(3)}  ${bar(category.score)}`,
    );
  }

  lines.push("");
  lines.push("=".repeat(56));

  let current: Category | null = null;
  const ordered = [...report.results].sort((a, b) =>
    a.category.localeCompare(b.category),
  );

  for (const item of ordered) {
    if (item.category !== current) {
      current = item.category;
      lines.push("");
      lines.push(paint(color, "1", CATEGORY_LABEL[current]));
    }
    const style = SEVERITY_STYLE[item.severity];
    const tag = paint(color, style.code, `[${style.label}]`);
    lines.push(`${tag} ${item.title}`);
    lines.push(`       ${item.message}`);
    if (item.hint && item.severity !== "pass") {
      lines.push(paint(color, "2", `       hint: ${item.hint}`));
    }
  }

  lines.push("");
  lines.push("=".repeat(56));
  lines.push(
    `Summary: ${report.summary.pass} pass · ${report.summary.warn} warn · ${report.summary.fail} fail · ${report.summary.info} info`,
  );

  if (report.summary.fail === 0 && report.score >= 85) {
    lines.push("Ship-ready. This repo looks public-friendly.");
  } else if (report.summary.fail === 0) {
    lines.push("No hard failures. Tighten warnings to raise the score.");
  } else {
    lines.push("Fix FAIL items before publishing.");
  }

  lines.push("Tip: run `repoaudit fix .` to scaffold missing hygiene files.");
  return lines.join("\n");
}

export function formatJson(report: AuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# repoaudit report`);
  lines.push("");
  lines.push(`- **Path:** \`${report.root}\``);
  lines.push(`- **Score:** **${report.score}/100** (grade ${report.grade})`);
  lines.push(
    `- **Summary:** ${report.summary.pass} pass / ${report.summary.warn} warn / ${report.summary.fail} fail / ${report.summary.info} info`,
  );
  lines.push("");
  lines.push(`## Category scores`);
  lines.push("");
  lines.push(`| Category | Score |`);
  lines.push(`|---|---:|`);
  for (const c of report.categories) {
    lines.push(`| ${CATEGORY_LABEL[c.category]} | ${c.score} |`);
  }
  lines.push("");
  lines.push(`## Findings`);
  lines.push("");
  for (const item of report.results) {
    lines.push(
      `- **[${item.severity.toUpperCase()}] ${item.title}** — ${item.message}`,
    );
    if (item.hint && item.severity !== "pass") {
      lines.push(`  - hint: ${item.hint}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function formatBadgeMarkdown(report: AuditReport): string {
  const color =
    report.grade === "A"
      ? "2ea44f"
      : report.grade === "B"
        ? "3fb950"
        : report.grade === "C"
          ? "d29922"
          : report.grade === "D"
            ? "db6d28"
            : "cf222e";
  const label = encodeURIComponent("repoaudit");
  const message = encodeURIComponent(`${report.score}% ${report.grade}`);
  return `![repoaudit](https://img.shields.io/badge/${label}-${message}-${color})`;
}
