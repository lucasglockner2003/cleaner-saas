import { resolveDatabaseUrl, resolveProjectPath, runSqlFile } from "./sql-runner.mjs";

function main() {
  const databaseUrl = resolveDatabaseUrl();
  runSqlFile({
    label: "staging reset",
    filePath: resolveProjectPath("supabase/seeds/staging/reset.sql"),
    databaseUrl
  });
  console.log("[db] Staging reset completed.");
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
