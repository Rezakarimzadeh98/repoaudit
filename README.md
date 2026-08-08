# repoaudit

Audit a Git repository for open-source readiness before you publish it.

`repoaudit` checks the boring-but-important parts of a public repo: README quality, license, CI, tests, `.gitignore`, and common secret leaks. Use it on your own projects or as a quick review pass on someone else's tree.

## Install

```bash
npm install -g repoaudit
```

Or run once without installing:

```bash
npx repoaudit .
```

## Usage

```bash
# audit the current directory
repoaudit

# audit another path
repoaudit ./my-project

# fail on warnings too
repoaudit . --strict

# machine-readable output
repoaudit . --json
```

### Sample output

```text
RepoAudit — /path/to/project
================================================
[PASS] README
       Found README.md.
[PASS] License file
       Found LICENSE (MIT).
[WARN] CI workflows
       No CI configuration detected.
       hint: Add a simple GitHub Actions workflow for install/build/test.
[FAIL] Sensitive files
       Possibly sensitive files tracked in the tree: .env
================================================
Summary: 8 pass · 1 warn · 1 fail · 2 info
```

## What it checks

| Area | Examples |
|------|----------|
| Docs | README presence/length, usage section, CONTRIBUTING, CODE_OF_CONDUCT |
| License | LICENSE file detection (MIT, Apache-2.0, GPL-3.0, BSD-3-Clause) |
| Security | `.env` / credential filenames, `.gitignore` rules, secret-like patterns |
| CI & tests | GitHub Actions / other CI configs, test files |
| Metadata | `package.json` description/license/keywords, EditorConfig |

Exit codes:

- `0` — no failures (warnings allowed unless `--strict`)
- `1` — one or more failures (or warnings in strict mode)
- `2` — unexpected runtime error

## Development

```bash
npm install
npm run build
npm test
node bin/repoaudit.js .
```

## Why this exists

Publishing a repo is easy. Making it look trustworthy is not. `repoaudit` is a fast local checklist so you catch missing docs, license gaps, and obvious secret mistakes before the first clone.

## License

MIT
