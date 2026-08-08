# Using repoaudit in GitHub Actions

```yaml
name: repoaudit
on:
  pull_request:
  push:
    branches: [main]
jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Rezakarimzadeh98/repoaudit@main
        with:
          path: .
          strict: "true"
          markdown: "true"
```

Tips:

- Keep `strict: false` until the repo score is healthy, then flip it on.
- The markdown report lands in the Actions job summary — useful in PR reviews.
- Pair with `repoaudit fix` locally to clear the first wave of findings fast.
