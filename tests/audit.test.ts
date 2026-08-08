import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { exitCodeFor, runAudit } from "../src/audit.ts";

async function makeTempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "repoaudit-"));
}

test("fails when README and LICENSE are missing", async () => {
  const root = await makeTempRepo();
  const report = await runAudit({ root, json: false, strict: false });
  assert.equal(report.summary.fail > 0, true);
  assert.equal(exitCodeFor(report, false), 1);
});

test("passes core checks for a well-prepared repo", async () => {
  const root = await makeTempRepo();

  await writeFile(
    path.join(root, "README.md"),
    `# Demo\n\n## Install\n\nnpm i demo\n\n## Usage\n\nRun the CLI.\n\nMore details here for length.\n`,
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
  await mkdir(path.join(root, "tests"), { recursive: true });
  await writeFile(path.join(root, "tests", "demo.test.js"), "test('ok', () => {});");
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "demo",
      description: "demo package",
      license: "MIT",
      keywords: ["cli", "audit", "tools"],
    }),
  );

  const report = await runAudit({ root, json: false, strict: false });
  assert.equal(report.summary.fail, 0);
  assert.equal(exitCodeFor(report, false), 0);
});

test("detects a tracked .env file as a failure", async () => {
  const root = await makeTempRepo();
  await writeFile(path.join(root, "README.md"), "# x\n\n## Install\n\na\n\n## Usage\n\nb\n\nc\n\nd\n");
  await writeFile(path.join(root, "LICENSE"), "MIT License\npermission is hereby granted, free of charge\n");
  await writeFile(path.join(root, ".env"), "SECRET=supersecretvalue123");

  const report = await runAudit({ root, json: false, strict: false });
  const sensitive = report.results.find((r) => r.id === "security.sensitive_files");
  assert.ok(sensitive);
  assert.equal(sensitive?.severity, "fail");
});
