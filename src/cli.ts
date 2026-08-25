import path from "node:path";
import process from "node:process";
import { exitCodeFor, runAudit } from "./audit.js";
import { applyFixes } from "./fix.js";
import {
  formatBadgeMarkdown,
  formatJson,
  formatMarkdown,
  formatText,
} from "./report.js";

function printHelp(): void {
  console.log(`
repoaudit — score a repository for open-source readiness

Usage:
  repoaudit [path] [options]
  repoaudit fix [path]
  repoaudit badge [path]

Options:
  --json         JSON report (includes score + categories)
  --md           Markdown report (great for PR comments)
  --strict       Treat warnings as failures
  --check-links  Check README http/https links (network)
  --offline      Skip optional network checks
  --no-color     Disable ANSI colors
  -h, --help     Show help

Commands:
  fix            Scaffold missing LICENSE, CI, SECURITY, templates, etc.
  badge          Print a shields.io markdown badge for the current score

Examples:
  npx repoaudit .
  npx repoaudit . --md
  npx repoaudit fix .
  npx repoaudit badge .
`.trim());
}

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const positionals: string[] = [];

  for (const arg of argv) {
    if (arg.startsWith("-")) flags.add(arg);
    else positionals.push(arg);
  }

  const command =
    positionals[0] === "fix" || positionals[0] === "badge"
      ? positionals[0]
      : "audit";
  const pathArg =
    command === "audit" ? positionals[0] : positionals[1] ?? positionals[0];

  return {
    command,
    help: flags.has("-h") || flags.has("--help"),
    json: flags.has("--json"),
    markdown: flags.has("--md") || flags.has("--markdown"),
    strict: flags.has("--strict"),
    checkLinks: flags.has("--check-links"),
    offline: flags.has("--offline"),
    noColor: flags.has("--no-color"),
    root: path.resolve(
      command === "audit"
        ? (pathArg ?? process.cwd())
        : (positionals[1] ?? process.cwd()),
    ),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.command === "fix") {
    const result = await applyFixes(options.root);
    console.log(`repoaudit fix — ${options.root}`);
    if (result.created.length === 0) {
      console.log("Nothing to create. Hygiene files already exist.");
    } else {
      console.log("Created:");
      for (const file of result.created) console.log(`  + ${file}`);
    }
    console.log("\nRe-run `repoaudit .` to see your new score.");
    process.exit(0);
  }

  const report = await runAudit({
    root: options.root,
    json: options.json,
    markdown: options.markdown,
    strict: options.strict,
    noColor: options.noColor,
  });

  if (options.command === "badge") {
    process.stdout.write(`${formatBadgeMarkdown(report)}\n`);
    process.exit(0);
  }

  if (options.json) process.stdout.write(formatJson(report));
  else if (options.markdown) process.stdout.write(formatMarkdown(report));
  else process.stdout.write(`${formatText(report, options.noColor)}\n`);

  process.exit(exitCodeFor(report, options.strict));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`repoaudit failed: ${message}`);
  process.exit(2);
});
