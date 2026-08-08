import type { Category, CategoryScore, CheckResult, Grade } from "./types.js";

const CATEGORIES: Category[] = [
  "docs",
  "license",
  "security",
  "ci",
  "packaging",
  "community",
];

export function scoreResults(results: CheckResult[]): {
  score: number;
  grade: Grade;
  categories: CategoryScore[];
} {
  const categories = CATEGORIES.map((category) => {
    const items = results.filter((r) => r.category === category);
    const scored = items.filter((r) => r.severity !== "info");
    let earned = 0;
    let possible = 0;

    for (const item of scored) {
      const weight = item.weight ?? 1;
      possible += weight;
      if (item.severity === "pass") earned += weight;
      else if (item.severity === "warn") earned += weight * 0.45;
    }

    const score = possible === 0 ? 100 : Math.round((earned / possible) * 100);
    return {
      category,
      score,
      pass: items.filter((r) => r.severity === "pass").length,
      warn: items.filter((r) => r.severity === "warn").length,
      fail: items.filter((r) => r.severity === "fail").length,
      info: items.filter((r) => r.severity === "info").length,
    };
  });

  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
  );

  return { score: overall, grade: gradeFor(overall), categories };
}

export function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function badgeColor(grade: Grade): string {
  switch (grade) {
    case "A":
      return "2ea44f";
    case "B":
      return "3fb950";
    case "C":
      return "d29922";
    case "D":
      return "db6d28";
    case "F":
      return "cf222e";
  }
}
