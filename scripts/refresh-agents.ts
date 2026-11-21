import { refreshAgentFacts } from "../src/agents/refresh";

async function main() {
  const result = await refreshAgentFacts();
  console.log(
    `agents:refresh updated=${result.updated.length} unchanged=${result.unchanged.length} errors=${result.errors.length}`,
  );
  for (const slug of result.updated) console.log(`  ~ ${slug}`);
  for (const error of result.errors) console.error(`  ! ${error}`);
  if (result.errors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
