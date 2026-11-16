import { collectIdeas, type CollectSource } from "../src/ideas/collect";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const source = (arg("--source") as CollectSource | undefined) ?? "all";
  if (source && !["hn", "blogs", "youtube", "all"].includes(source)) {
    console.error("usage: npm run ideas:collect -- [--source hn|blogs|youtube|all] [--limit N] [--dry-run]");
    process.exit(2);
  }
  const limitRaw = arg("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  if (limitRaw && (!Number.isFinite(limit) || (limit as number) < 1)) {
    console.error("--limit must be a positive number");
    process.exit(2);
  }

  const result = await collectIdeas({
    source,
    limit,
    dryRun: has("--dry-run"),
  });

  console.log(
    `ideas:collect considered=${result.considered} added=${result.added.length} skipped=${result.skipped.length}`,
  );
  for (const idea of result.added) {
    console.log(`  + ${idea.slug} (${idea.category}, score=${idea.score ?? "?"}) ${idea.sources[0]}`);
  }
  if (has("--verbose")) {
    for (const s of result.skipped.slice(0, 30)) {
      console.log(`  - skip ${s.slug}: ${s.reason}`);
    }
  }
  for (const e of result.errors) console.error(`  ! ${e}`);
  if (result.errors.length > 0 && result.added.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
