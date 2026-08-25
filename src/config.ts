import path from "node:path";
import type { Category } from "./types.js";
import { exists, readText } from "./fs.js";

export interface RepoAuditConfig {
  disabledChecks?: string[];
  weights?: Record<string, number>;
  strictCategories?: Category[];
}

const VALID_CATEGORIES: Category[] = [
  "docs",
  "license",
  "security",
  "ci",
  "packaging",
  "community",
];

function failConfig(reason: string): never {
  throw new Error(`Invalid .repoauditrc.json: ${reason}`);
}

export async function loadRepoAuditConfig(root: string): Promise<RepoAuditConfig> {
  const configPath = path.join(root, ".repoauditrc.json");
  if (!(await exists(configPath))) return {};

  const raw = await readText(configPath);
  if (!raw) {
    failConfig("file exists but could not be read.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    failConfig("must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    failConfig("root value must be a JSON object.");
  }

  const obj = parsed as Record<string, unknown>;
  const config: RepoAuditConfig = {};

  if (typeof obj.disabledChecks !== "undefined") {
    if (
      !Array.isArray(obj.disabledChecks) ||
      obj.disabledChecks.some((item) => typeof item !== "string")
    ) {
      failConfig("disabledChecks must be an array of strings.");
    }
    config.disabledChecks = obj.disabledChecks;
  }

  if (typeof obj.weights !== "undefined") {
    if (!obj.weights || typeof obj.weights !== "object" || Array.isArray(obj.weights)) {
      failConfig("weights must be an object of { checkId: number }.");
    }

    const entries = Object.entries(obj.weights);
    const map: Record<string, number> = {};
    for (const [checkId, value] of entries) {
      if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
        failConfig(`weights.${checkId} must be a positive number.`);
      }
      map[checkId] = value;
    }
    config.weights = map;
  }

  if (typeof obj.strictCategories !== "undefined") {
    if (
      !Array.isArray(obj.strictCategories) ||
      obj.strictCategories.some((item) => typeof item !== "string")
    ) {
      failConfig("strictCategories must be an array of category strings.");
    }

    const invalid = obj.strictCategories.filter(
      (category) => !VALID_CATEGORIES.includes(category as Category),
    );
    if (invalid.length > 0) {
      failConfig(`strictCategories contains invalid values: ${invalid.join(", ")}.`);
    }

    config.strictCategories = obj.strictCategories as Category[];
  }

  return config;
}
