import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export function resolveProjectPath(relativePath) {
  return path.resolve(PROJECT_ROOT, relativePath);
}

export function getArgValue(flagName) {
  const flag = `--${flagName}`;
  const argv = process.argv;
  const index = argv.indexOf(flag);
  if (index < 0 || index === argv.length - 1) {
    return "";
  }

  return String(argv[index + 1] || "").trim();
}

export function resolveDatabaseUrl() {
  const fromArg = getArgValue("database-url");
  if (fromArg) {
    return fromArg;
  }
  return String(process.env.STAGING_DATABASE_URL || "").trim();
}

export function runSqlFile({ label, filePath, databaseUrl, psqlBin = process.env.PSQL_BIN || "psql" }) {
  if (!databaseUrl) {
    throw new Error("Missing staging database URL. Set STAGING_DATABASE_URL or pass --database-url.");
  }

  if (!existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }

  console.log(`[db] Running ${label}: ${filePath}`);
  const result = spawnSync(psqlBin, [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath], {
    stdio: "inherit"
  });

  if (result.error) {
    throw new Error(`Failed to execute ${label}: ${result.error.message}`);
  }

  if ((result.status || 0) !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }
}
