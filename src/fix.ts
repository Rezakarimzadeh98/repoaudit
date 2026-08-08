import path from "node:path";
import { exists, writeIfMissing } from "./fs.js";

export interface FixResult {
  created: string[];
  skipped: string[];
}

const MIT = `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const GITIGNORE = `node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
Thumbs.db
.vscode/
.idea/
`;

const SECURITY = `# Security Policy

If you discover a security vulnerability, please open a private advisory on GitHub
or contact the maintainers directly. Do not open a public issue with exploit details.

The latest release on the default branch is supported.
`;

const CONTRIBUTING = `# Contributing

Thanks for helping improve this project.

1. Fork and clone the repository
2. Create a feature branch
3. Make your change with clear commits
4. Open a pull request describing what changed and why

Bug fixes, docs improvements, and small focused features are welcome.
`;

const CODE_OF_CONDUCT = `# Code of Conduct

Be respectful, assume good intent, and keep feedback constructive.
Harassment or discrimination of any kind is not welcome.

If you experience or witness unacceptable behavior, contact the maintainers.
`;

const CHANGELOG = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Initial public checklist items
`;

const BUG_TEMPLATE = `---
name: Bug report
about: Report unexpected behavior
labels: bug
---

### What happened

### Expected behavior

### Steps to reproduce

### Environment
`;

const FEATURE_TEMPLATE = `---
name: Feature request
about: Suggest an improvement
labels: enhancement
---

### Problem

### Proposed solution
`;

const PR_TEMPLATE = `## Summary

## Checklist

- [ ] Tests added/updated when behavior changes
- [ ] Docs updated if needed
`;

const CI = `name: ci

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Detect and test
        run: |
          if [ -f package.json ]; then
            npm install
            npm test --if-present
          else
            echo "No package.json — add your language-specific CI steps."
          fi
`;

const DEPENDABOT = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
`;

export async function applyFixes(root: string): Promise<FixResult> {
  const created: string[] = [];
  const skipped: string[] = [];

  async function maybe(rel: string, content: string): Promise<void> {
    const full = path.join(root, rel);
    const wrote = await writeIfMissing(full, content);
    if (wrote) created.push(rel);
    else skipped.push(rel);
  }

  if (!(await exists(path.join(root, "LICENSE")))) {
    await maybe("LICENSE", MIT);
  } else {
    skipped.push("LICENSE");
  }

  await maybe(".gitignore", GITIGNORE);
  await maybe("SECURITY.md", SECURITY);
  await maybe("CONTRIBUTING.md", CONTRIBUTING);
  await maybe("CODE_OF_CONDUCT.md", CODE_OF_CONDUCT);
  await maybe("CHANGELOG.md", CHANGELOG);
  await maybe(".github/ISSUE_TEMPLATE/bug_report.md", BUG_TEMPLATE);
  await maybe(".github/ISSUE_TEMPLATE/feature_request.md", FEATURE_TEMPLATE);
  await maybe(".github/PULL_REQUEST_TEMPLATE.md", PR_TEMPLATE);
  await maybe(".github/workflows/ci.yml", CI);
  await maybe(".github/dependabot.yml", DEPENDABOT);

  if (!(await exists(path.join(root, "README.md")))) {
    await maybe(
      "README.md",
      `# Project\n\n## Install\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nDescribe how to use this project.\n`,
    );
  } else {
    skipped.push("README.md");
  }

  return { created, skipped };
}
