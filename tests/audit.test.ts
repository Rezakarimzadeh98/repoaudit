import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { exitCodeFor, runAudit } from "../src/audit.ts";
import { applyFixes } from "../src/fix.ts";
import { formatBadgeMarkdown } from "../src/report.ts";

const opts = {
  json: false,
  markdown: false,
  strict: false,
  noColor: true,
};

async function makeTempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "repoaudit-"));
}

test("fails when README and LICENSE are missing", async () => {
  const root = await makeTempRepo();
  const report = await runAudit({ root, ...opts });
  assert.equal(report.summary.fail > 0, true);
  assert.equal(exitCodeFor(report, false), 1);
  assert.ok(report.score < 80);
});

test("scores a well-prepared repo highly", async () => {
  const root = await makeTempRepo();

  await writeFile(
    path.join(root, "README.md"),
    `# Demo\n\n## Install\n\n\`\`\`bash\nnpm i demo\n\`\`\`\n\n## Usage\n\nRun the CLI.\n\n![demo](demo.png)\n`,
  );
  await writeFile(
    path.join(root, "LICENSE"),
    `MIT License\n\nPermission is hereby granted, free of charge...\n`,
  );
  await writeFile(path.join(root, ".gitignore"), "node_modules/\n.env\n");
  await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
  await writeFile(
    path.join(root, ".github", "workflows", "ci.yml"),
    "name: ci\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n",
  );
  await mkdir(path.join(root, ".github", "ISSUE_TEMPLATE"), { recursive: true });
  await writeFile(
    path.join(root, ".github", "ISSUE_TEMPLATE", "bug.md"),
    "---\nname: bug\n---\n",
  );
  await writeFile(path.join(root, "CONTRIBUTING.md"), "# Contributing\n");
  await writeFile(path.join(root, "SECURITY.md"), "# Security\n");
  await mkdir(path.join(root, "tests"), { recursive: true });
  await writeFile(path.join(root, "tests", "demo.test.js"), "test('ok', () => {});");
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "demo",
      description: "demo package",
      license: "MIT",
      repository: { type: "git", url: "https://github.com/acme/demo.git" },
      keywords: ["cli", "audit", "tools"],
      scripts: { test: "node --test", lint: "eslint ." },
      bin: { demo: "bin.js" },
    }),
  );
  await writeFile(path.join(root, "package-lock.json"), "{}");

  const report = await runAudit({ root, ...opts });
  assert.equal(report.summary.fail, 0);
  assert.ok(report.score >= 85);
  assert.ok(["A", "B"].includes(report.grade));
  assert.match(formatBadgeMarkdown(report), /shields\.io/);
});

test("detects a tracked .env file as a failure", async () => {
  const root = await makeTempRepo();
  await writeFile(
    path.join(root, "README.md"),
    "# x\n\n## Install\n\na\n\n## Usage\n\nb\n\nc\n\nd\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await writeFile(path.join(root, ".env"), "SECRET=supersecretvalue123");

  const report = await runAudit({ root, ...opts });
  const sensitive = report.results.find((r) => r.id === "security.sensitive_files");
  assert.ok(sensitive);
  assert.equal(sensitive?.severity, "fail");
});

test("fix scaffolds missing hygiene files", async () => {
  const root = await makeTempRepo();
  const result = await applyFixes(root);
  assert.ok(result.created.includes("LICENSE"));
  assert.ok(result.created.includes(".gitignore"));
  assert.ok(result.created.includes(".github/workflows/ci.yml"));
});
