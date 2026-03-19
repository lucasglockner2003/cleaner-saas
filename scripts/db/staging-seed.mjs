import { resolveDatabaseUrl, resolveProjectPath, runSqlFile } from "./sql-runner.mjs";

function main() {
  const databaseUrl = resolveDatabaseUrl();
  runSqlFile({
    label: "staging seed",
    filePath: resolveProjectPath("supabase/seeds/staging/seed.sql"),
    databaseUrl
  });
  console.log("[db] Staging seed completed.");
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
