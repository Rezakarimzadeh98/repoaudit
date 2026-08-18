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
  await mkdir(path.join(root, ".github", "PULL_REQUEST_TEMPLATE"), { recursive: true });
  await writeFile(
    path.join(root, ".github", "PULL_REQUEST_TEMPLATE", "feature.md"),
    "## Summary\n",
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

test("recognizes well-formed pyproject.toml packaging metadata", async () => {
  const root = await makeTempRepo();
  await writeFile(
    path.join(root, "README.md"),
    "# Demo\n\n## Install\n\npip install .\n\n## Usage\n\nRun the package.\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await writeFile(
    path.join(root, "pyproject.toml"),
    `[project]\nname = "demo"\nversion = "0.1.0"\ndependencies = ["requests>=2.31"]\n\n[build-system]\nrequires = ["setuptools>=61"]\nbuild-backend = "setuptools.build_meta"\n`,
  );

  const report = await runAudit({ root, ...opts });
  const pyprojectCheck = report.results.find(
    (r) => r.id === "packaging.python.pyproject",
  );

  assert.ok(pyprojectCheck);
  assert.equal(pyprojectCheck?.severity, "pass");
  assert.match(pyprojectCheck?.message ?? "", /5\/5/i);
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

test("ignores sample env files in examples and fixtures", async () => {
  const root = await makeTempRepo();
  await writeFile(
    path.join(root, "README.md"),
    "# x\n\n## Install\n\na\n\n## Usage\n\nb\n\nc\n\nd\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await writeFile(path.join(root, ".gitignore"), ".env\n.env.*\n");
  await mkdir(path.join(root, "examples", "demo-app"), { recursive: true });
  await mkdir(path.join(root, "fixtures", "demo"), { recursive: true });
  await writeFile(
    path.join(root, "examples", "demo-app", ".env"),
    "# example only\nNEXT_PUBLIC_API_URL=https://example.test\n",
  );
  await writeFile(
    path.join(root, "fixtures", "demo", ".env.production"),
    "# fixture default\nENV_VARIABLE=fixture\n",
  );

  const report = await runAudit({ root, ...opts });
  const sensitive = report.results.find((r) => r.id === "security.sensitive_files");

  assert.equal(sensitive?.severity, "pass");
});

test("fix scaffolds missing hygiene files", async () => {
  const root = await makeTempRepo();
  const result = await applyFixes(root);
  assert.ok(result.created.includes("LICENSE"));
  assert.ok(result.created.includes(".gitignore"));
  assert.ok(result.created.includes(".github/workflows/ci.yml"));
});

test("detects lowercase GitHub community file names", async () => {
  const root = await makeTempRepo();

  await writeFile(
    path.join(root, "README.md"),
    "# Demo\n\n## Install\n\nnpm install\n\n## Usage\n\nnpm run dev\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await mkdir(path.join(root, ".github", "issue_template"), { recursive: true });
  await writeFile(path.join(root, "contributing.md"), "# Contributing\n");
  await writeFile(path.join(root, "code_of_conduct.md"), "# Code of Conduct\n");
  await writeFile(path.join(root, "changelog.md"), "# Changelog\n");
  await writeFile(
    path.join(root, ".github", "issue_template", "bug.md"),
    "---\nname: bug\n---\n",
  );
  await writeFile(
    path.join(root, ".github", "pull_request_template.md"),
    "## Summary\n",
  );
  await writeFile(path.join(root, ".github", "funding.yml"), "github: [acme]\n");

  const report = await runAudit({ root, ...opts });

  assert.equal(
    report.results.find((r) => r.id === "community.contributing")?.severity,
    "pass",
  );
  assert.equal(
    report.results.find((r) => r.id === "community.code_of_conduct")?.severity,
    "pass",
  );
  assert.equal(
    report.results.find((r) => r.id === "community.changelog")?.severity,
    "pass",
  );
  assert.equal(
    report.results.find((r) => r.id === "community.issue_templates")?.severity,
    "pass",
  );
  assert.equal(
    report.results.find((r) => r.id === "community.pr_template")?.severity,
    "pass",
  );
  assert.equal(
    report.results.find((r) => r.id === "community.funding")?.severity,
    "pass",
  );
});

test("does not flag UI password copy as a secret", async () => {
  const root = await makeTempRepo();
  await writeFile(
    path.join(root, "README.md"),
    "# x\n\n## Install\n\na\n\n## Usage\n\nb\n\nc\n\nd\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await writeFile(path.join(root, ".gitignore"), ".env\n");
  await writeFile(
    path.join(root, "app.js"),
    `console.error('Failed to copy password:', err);\nconst form = { password: '' };\n`,
  );

  const report = await runAudit({ root, ...opts });
  const secrets = report.results.find((r) => r.id === "security.secret_patterns");
  assert.equal(secrets?.severity, "pass");
});

test("detects pull request templates stored under .github/PULL_REQUEST_TEMPLATE", async () => {
  const root = await makeTempRepo();
  await mkdir(path.join(root, ".github", "PULL_REQUEST_TEMPLATE"), { recursive: true });
  await writeFile(
    path.join(root, ".github", "PULL_REQUEST_TEMPLATE", "bugfix.md"),
    "## Checklist\n",
  );

  const report = await runAudit({ root, ...opts });
  const prTemplate = report.results.find((r) => r.id === "community.pr_template");
  assert.equal(prTemplate?.severity, "pass");
});

test("secret scan budget is applied after ignored paths are filtered", async () => {
  const root = await makeTempRepo();
  await writeFile(
    path.join(root, "README.md"),
    "# x\n\n## Install\n\na\n\n## Usage\n\nb\n\nc\n\nd\n",
  );
  await writeFile(
    path.join(root, "LICENSE"),
    "MIT License\npermission is hereby granted, free of charge\n",
  );
  await writeFile(path.join(root, ".gitignore"), ".env\n");
  await mkdir(path.join(root, "fixtures"), { recursive: true });
  for (let index = 0; index < 550; index += 1) {
    await writeFile(path.join(root, "fixtures", `sample-${index}.json`), '{"ok":true}\n');
  }
  const tokenValue = ["ghp_", "1234567890", "ABCDEFGHIJKLMNOP"].join("");
  const appSource = 'const ' + 'token' + ' = "' + tokenValue + '";\n';
  await writeFile(path.join(root, "app.js"), appSource);

  const report = await runAudit({ root, ...opts });
  const secrets = report.results.find((r) => r.id === "security.secret_patterns");
  assert.equal(secrets?.severity, "fail");
});
