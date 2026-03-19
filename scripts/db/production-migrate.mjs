import { resolveDatabaseUrlByKey, resolveProjectPath, runSqlFile } from "./sql-runner.mjs";

function main() {
  const databaseUrl = resolveDatabaseUrlByKey("PRODUCTION_DATABASE_URL");
  runSqlFile({
    label: "production migration bundle",
    filePath: resolveProjectPath("supabase/migrations/generated/pilot-launch-bundle.sql"),
    databaseUrl
  });
  console.log("[db] Production migration bundle applied.");
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
