# Ready-to-post launch copy

Copy/paste these when you share `repoaudit`. Keep the repo link first.

## Short (X / LinkedIn / Telegram)

Score any Git repo before you make it public.

`repoaudit` gives a 0–100 readiness grade for docs, license, security, CI, packaging, and community hygiene — then `repoaudit fix` scaffolds the missing files.

GitHub Action included.

https://github.com/Rezakarimzadeh98/repoaudit

```bash
npx --yes github:Rezakarimzadeh98/repoaudit
```

## Reddit (r/programming / r/commandline / r/opensource)

**Title:** repoaudit – score a GitHub repo for open-source readiness (and fix gaps)

**Body:**
I got tired of publishing repos that were missing LICENSE/CI/.gitignore or had an accidental `.env`.

So I built `repoaudit`:
- 0–100 score + letter grade
- checks docs, license, secrets, CI/tests, packaging, community files
- `repoaudit fix` scaffolds missing hygiene files
- GitHub Action for PR gates

Repo: https://github.com/Rezakarimzadeh98/repoaudit

Feedback and PRs welcome — there are `good first issue` tasks open.

## Dev.to / Hashnode (outline)

1. Hook: “Your code can be great and your repo still look untrustworthy.”
2. Show before/after scores on a messy folder vs a polished one
3. Walk through `repoaudit .`, `repoaudit fix .`, Action YAML
4. Invite contributors via good first issues
5. Link: https://github.com/Rezakarimzadeh98/repoaudit

## Hacker News (Show HN)

**Title:** Show HN: repoaudit – score and fix open-source readiness gaps

**Text:**
repoaudit audits a repository for public-readiness (README/license/secrets/CI/community) and returns a 0–100 grade. `repoaudit fix` can scaffold the boring missing files. Also ships as a GitHub Action.

https://github.com/Rezakarimzadeh98/repoaudit

## Discord / Slack one-liner

Need a pre-publish checklist for GitHub repos? Try `npx --yes github:Rezakarimzadeh98/repoaudit` — scores readiness and can scaffold LICENSE/CI/SECURITY in one go.
