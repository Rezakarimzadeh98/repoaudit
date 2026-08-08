# Changelog

## [2.0.1] - 2026-08-08

### Changed
- Aligned published package metadata with the v2.0.1 Action/runtime release
- Kept Node 24-compatible GitHub Actions pin set as the supported baseline

## [2.0.0] - 2026-08-08

### Added
- Overall readiness score (0–100) and letter grade
- Category breakdown: docs, license, security, CI, packaging, community
- `repoaudit fix` to scaffold missing hygiene files
- `repoaudit badge` for shields.io markdown badges
- `--md` markdown reports for PR / Actions summaries
- Colored terminal output
- GitHub Action (`action.yml`) for CI integration
- Broader checks: badges/demo in README, Dependabot, lockfiles, scripts, issue/PR templates

### Changed
- CLI report layout redesigned around score + categories
