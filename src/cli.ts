import path from "node:path";
import process from "node:process";
import { exitCodeFor, runAudit } from "./audit.js";
import { formatJson, formatText } from "./report.js";

function printHelp(): void {
  const text = `
repoaudit — audit a Git repository for open-source readiness

Usage:
  repoaudit [path] [options]

Options:
  --json       Output machine-readable JSON
  --strict     Treat warnings as failures (exit code 1)
  -h, --help   Show this help

Examples:
  repoaudit
  repoaudit ./my-project
  repoaudit . --strict
  repoaudit . --json
`.trim();
  console.log(text);
}

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const positionals: string[] = [];

  for (const arg of argv) {
    if (arg.startsWith("-")) flags.add(arg);
    else positionals.push(arg);
  }

  return {
    help: flags.has("-h") || flags.has("--help"),
    json: flags.has("--json"),
    strict: flags.has("--strict"),
    root: path.resolve(positionals[0] ?? process.cwd()),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const report = await runAudit({
    root: options.root,
    json: options.json,
    strict: options.strict,
  });

  process.stdout.write(options.json ? formatJson(report) : `${formatText(report)}\n`);
  process.exit(exitCodeFor(report, options.strict));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`repoaudit failed: ${message}`);
  process.exit(2);
});
