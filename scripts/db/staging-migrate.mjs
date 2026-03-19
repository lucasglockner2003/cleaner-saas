import { resolveDatabaseUrlByKey, resolveProjectPath, runSqlFile } from "./sql-runner.mjs";

function main() {
  const databaseUrl = resolveDatabaseUrlByKey("STAGING_DATABASE_URL");
  runSqlFile({
    label: "staging migration bundle",
    filePath: resolveProjectPath("supabase/migrations/generated/pilot-launch-bundle.sql"),
    databaseUrl
  });
  console.log("[db] Staging migration bundle applied.");
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
