import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function getArgValue(flagName) {
  const flag = `--${flagName}`;
  const argv = process.argv;
  const index = argv.indexOf(flag);
  if (index < 0 || index === argv.length - 1) {
    return "";
  }
  return String(argv[index + 1] || "").trim();
}

function resolvePath(relativeOrAbsolute) {
  if (!relativeOrAbsolute) {
    return "";
  }
  if (path.isAbsolute(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  return path.resolve(PROJECT_ROOT, relativeOrAbsolute);
}

function readManifest(manifestPath) {
  const raw = readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw);
  const migrations = Array.isArray(parsed.migrations) ? parsed.migrations : [];
  if (migrations.length === 0) {
    throw new Error("Bundle manifest must include at least one migration file.");
  }
  return {
    name: parsed.name || "unnamed-bundle",
    migrations
  };
}

function buildBundleContent(manifest, migrationPaths) {
  const now = new Date().toISOString();
  const parts = [
    "-- Auto-generated migration bundle",
    `-- Bundle: ${manifest.name}`,
    `-- Generated at: ${now}`,
    ""
  ];

  migrationPaths.forEach((migrationPath, index) => {
    const fileBody = readFileSync(migrationPath, "utf8");
    parts.push(`-- [${index + 1}] ${path.relative(PROJECT_ROOT, migrationPath)}`);
    parts.push(fileBody.trim());
    parts.push("");
  });

  return `${parts.join("\n")}\n`;
}

function main() {
  const manifestArg = getArgValue("manifest");
  const outputArg = getArgValue("out");
  if (!manifestArg || !outputArg) {
    throw new Error("Usage: node scripts/db/build-migration-bundle.mjs --manifest <file> --out <file>");
  }

  const manifestPath = resolvePath(manifestArg);
  const outputPath = resolvePath(outputArg);
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = readManifest(manifestPath);
  const migrationPaths = manifest.migrations.map((migration) => resolvePath(migration));
  migrationPaths.forEach((migrationPath) => {
    if (!existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
  });

  const content = buildBundleContent(manifest, migrationPaths);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
  console.log(`[db] Bundle "${manifest.name}" written to ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
