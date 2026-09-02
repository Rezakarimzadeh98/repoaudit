# repoaudit go-global plan

This plan turns repoaudit into the default pre-publish gate for open-source repositories.

## Phase 1 - product clarity (week 1)

- Keep README examples short and copy-paste valid.
- Keep scoring model and categories transparent.
- Keep Action usage pinned to stable release tags.
- Keep autofix behavior safe: create-only, never overwrite.

Success metrics:
- New user reaches first score in < 2 minutes
- README command paths remain fully valid

## Phase 2 - growth via utility (weeks 2-4)

- Expand checks with low false positives.
- Add language/ecosystem check packs incrementally.
- Publish before/after examples from real repositories.
- Keep docs for strict mode and CI gating precise.

Success metrics:
- Increase repeated usage in CI workflows
- Decrease issue rate for false-positive reports

## Phase 3 - contributor onboarding (month 2)

- Maintain high-quality `good first issue` set.
- Add check authoring guide with test examples.
- Add fixtures for edge cases and regression prevention.
- Track contribution latency and unblock quickly.

Success metrics:
- External first-time PR conversion increases month-over-month
- At least 1 community-authored check each release cycle

## Phase 4 - category leadership (ongoing)

- Publish monthly checklist trend reports.
- Cross-share use cases where repoaudit prevented risky publication.
- Keep release cadence predictable.
- Maintain a public roadmap for requested checks.

Success metrics:
- Sustained growth in stars, clones, and Action consumption
- Community contributor ratio exceeds 30%

## Operating rules

- Keep scoring explainable and reproducible.
- Prefer actionable findings over abstract warnings.
- Prevent false confidence: surface uncertainty clearly.
- Never expose secrets in logs or sample outputs.
