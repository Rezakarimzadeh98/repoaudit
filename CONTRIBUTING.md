# Contributing

Thanks for helping improve `repoaudit`.

New here? Start with issues labeled [`good first issue`](https://github.com/Rezakarimzadeh98/repoaudit/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

## Setup

```bash
git clone https://github.com/Rezakarimzadeh98/repoaudit.git
cd repoaudit
npm install
npm test
npm run build
node bin/repoaudit.js .
```

## Easy ways to contribute

1. **Add a check** — new file under `src/checks/` or extend an existing category
2. **Improve hints** — make FAIL/WARN messages more actionable
3. **Reduce false positives** — especially in secret scanning
4. **Docs / examples** — README demos, Action recipes, language-specific guides
5. **Tests** — cover edge cases in `tests/`

## Demo / recording guide

For a short, polished contributor demo, follow the guide in [docs/recording-recipe.md](docs/recording-recipe.md). It covers asciinema, VHS, and a quick Windows Terminal capture workflow without bloating the repository with large binary assets.

## Checklist for a new check

- [ ] Clear `id`, `title`, `category`, and `severity`
- [ ] Helpful `hint` when not `pass`
- [ ] Sensible `weight` if it should affect the score
- [ ] At least one unit test
- [ ] Short note in PR description about why the check matters

## Guidelines

- Keep checks focused and explainable
- Prefer clear messages over clever ones
- Do not overwrite user files in `repoaudit fix`
- Keep the CLI surface small and predictable

## Pull requests

- One idea per PR when possible
- Describe what changed and why
- Run `npm test` before opening the PR

Bug fixes, new checks, docs improvements, and better false-positive handling are all welcome.
