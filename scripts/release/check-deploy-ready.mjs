import { spawnSync } from "node:child_process";

function getArgValue(flagName) {
  const flag = `--${flagName}`;
  const argv = process.argv;
  const index = argv.indexOf(flag);
  if (index < 0 || index === argv.length - 1) {
    return "";
  }
  return String(argv[index + 1] || "").trim();
}

function hasFlag(flagName) {
  return process.argv.includes(`--${flagName}`);
}

function runNpmScript(scriptName) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", scriptName], {
    stdio: "inherit"
  });

  if (result.error) {
    throw new Error(`Failed to run npm script "${scriptName}": ${result.error.message}`);
  }

  if ((result.status || 0) !== 0) {
    throw new Error(`npm script "${scriptName}" failed with exit code ${result.status}.`);
  }
}

function main() {
  const environment = getArgValue("environment") || "staging";
  const withDatabase = hasFlag("with-db");

  if (!["staging", "production"].includes(environment)) {
    throw new Error('Invalid --environment. Use "staging" or "production".');
  }

  const envScript = environment === "production" ? "check:env:production" : "check:env:staging";
  const migrateScript = environment === "production" ? "db:production:migrate" : "db:staging:migrate";

  console.log(`[deploy-check] Environment: ${environment}`);
  runNpmScript(envScript);
  runNpmScript("test:run");
  runNpmScript("build");
  runNpmScript("db:bundle:pilot");

  if (withDatabase) {
    runNpmScript(migrateScript);
  } else {
    console.log(`[deploy-check] Skipping database apply step. Run "npm run ${migrateScript}" when DB credentials are ready.`);
  }

  console.log("[deploy-check] All checks passed.");
}

try {
  main();
} catch (error) {
  console.error(`[deploy-check] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
