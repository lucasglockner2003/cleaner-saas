import { existsSync, readFileSync } from "node:fs";
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

function hasFlag(flagName) {
  return process.argv.includes(`--${flagName}`);
}

function parseEnvFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const delimiterIndex = line.indexOf("=");
      if (delimiterIndex < 0) {
        return acc;
      }
      const key = line.slice(0, delimiterIndex).trim();
      const rawValue = line.slice(delimiterIndex + 1).trim();
      const value =
        rawValue.startsWith('"') && rawValue.endsWith('"')
          ? rawValue.slice(1, -1)
          : rawValue.startsWith("'") && rawValue.endsWith("'")
            ? rawValue.slice(1, -1)
            : rawValue;
      acc[key] = value;
      return acc;
    }, {});
}

function hasValue(env, key) {
  return Boolean(String(env[key] || "").trim());
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function assert(check, message, list) {
  if (!check) {
    list.push(message);
  }
}

function normalizeRuntimeEnv(value) {
  const runtime = String(value || "local").toLowerCase();
  if (runtime === "staging" || runtime === "production" || runtime === "local") {
    return runtime;
  }
  return "local";
}

function parseExpectedRuntime(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "staging" || raw === "production" || raw === "local") {
    return raw;
  }
  return "";
}

function runValidation(env, options = {}) {
  const errors = [];
  const warnings = [];
  const runtimeEnv = normalizeRuntimeEnv(env.VITE_RUNTIME_ENV);
  const paymentProvider = String(env.VITE_PAYMENT_PROVIDER || "manual").toLowerCase();
  const strictMode = Boolean(options.strictMode);
  const expectedRuntime = options.expectedRuntime || "";

  assert(hasValue(env, "VITE_DATA_PROVIDER"), "Missing VITE_DATA_PROVIDER.", errors);
  assert(hasValue(env, "VITE_AUTH_PROVIDER"), "Missing VITE_AUTH_PROVIDER.", errors);
  assert(hasValue(env, "VITE_ORGANIZATION_ID"), "Missing VITE_ORGANIZATION_ID.", errors);

  const dataProvider = String(env.VITE_DATA_PROVIDER || "").toLowerCase();
  const authProvider = String(env.VITE_AUTH_PROVIDER || "").toLowerCase();
  const organizationId = String(env.VITE_ORGANIZATION_ID || "").trim();

  if (expectedRuntime && runtimeEnv !== expectedRuntime) {
    errors.push(`Expected VITE_RUNTIME_ENV=${expectedRuntime}, found ${runtimeEnv}.`);
  }

  if (runtimeEnv === "production") {
    if (dataProvider !== "supabase") {
      errors.push("Production runtime requires VITE_DATA_PROVIDER=supabase.");
    }
    if (authProvider !== "supabase") {
      errors.push("Production runtime requires VITE_AUTH_PROVIDER=supabase.");
    }
  }

  if (dataProvider === "supabase" || authProvider === "supabase") {
    assert(hasValue(env, "VITE_SUPABASE_URL"), "Supabase mode requires VITE_SUPABASE_URL.", errors);
    assert(hasValue(env, "VITE_SUPABASE_ANON_KEY"), "Supabase mode requires VITE_SUPABASE_ANON_KEY.", errors);
  }

  if (runtimeEnv !== "local" && organizationId === "org-default") {
    if (runtimeEnv === "production") {
      errors.push("VITE_ORGANIZATION_ID cannot remain org-default in production.");
    } else {
      warnings.push("VITE_ORGANIZATION_ID is still org-default in staging.");
    }
  }

  if (String(env.VITE_EMAIL_TRANSPORT || "mock").toLowerCase() === "webhook") {
    assert(hasValue(env, "VITE_EMAIL_WEBHOOK_URL"), "Webhook email transport requires VITE_EMAIL_WEBHOOK_URL.", errors);
  }

  if (String(env.VITE_PHOTO_STORAGE_PROVIDER || "placeholder").toLowerCase() === "webhook") {
    assert(hasValue(env, "VITE_PHOTO_WEBHOOK_URL"), "Webhook photo storage requires VITE_PHOTO_WEBHOOK_URL.", errors);
  }

  if (String(env.VITE_MAP_PROVIDER || "mock").toLowerCase() === "webhook") {
    assert(hasValue(env, "VITE_MAP_WEBHOOK_URL"), "Webhook map provider requires VITE_MAP_WEBHOOK_URL.", errors);
  }

  if (paymentProvider !== "manual") {
    assert(hasValue(env, "VITE_PAYMENT_WEBHOOK_URL"), "Provider-backed payment mode requires VITE_PAYMENT_WEBHOOK_URL.", errors);
    assert(hasValue(env, "VITE_PAYMENT_GATEWAY_AUTH_TOKEN"), "Provider-backed payment mode requires VITE_PAYMENT_GATEWAY_AUTH_TOKEN.", errors);
  }

  if (paymentProvider === "stripe") {
    assert(hasValue(env, "VITE_STRIPE_PUBLISHABLE_KEY"), "Stripe mode requires VITE_STRIPE_PUBLISHABLE_KEY.", errors);
    if (hasValue(env, "VITE_STRIPE_PUBLISHABLE_KEY") && !String(env.VITE_STRIPE_PUBLISHABLE_KEY).startsWith("pk_")) {
      warnings.push("VITE_STRIPE_PUBLISHABLE_KEY does not start with pk_.");
    }
    if (!hasValue(env, "STRIPE_SECRET_KEY") && !(runtimeEnv === "production" && strictMode)) {
      warnings.push("Missing STRIPE_SECRET_KEY in env file (server runtime must provide it).");
    }
    if (!hasValue(env, "STRIPE_WEBHOOK_SECRET") && !(runtimeEnv === "production" && strictMode)) {
      warnings.push("Missing STRIPE_WEBHOOK_SECRET in env file (server runtime must provide it).");
    }
  }

  if (runtimeEnv === "production") {
    const productionServerChecks = strictMode ? errors : warnings;
    if (!hasValue(env, "SUPABASE_SERVICE_ROLE_KEY")) {
      productionServerChecks.push("Missing SUPABASE_SERVICE_ROLE_KEY in env file (webhook/worker runtime must provide it).");
    }
    if (!hasValue(env, "PAYMENT_GATEWAY_AUTH_TOKEN")) {
      productionServerChecks.push("Missing PAYMENT_GATEWAY_AUTH_TOKEN in env file (webhook gateway should enforce it).");
    }
    if (!hasValue(env, "APP_PAYMENT_WEBHOOK_URL")) {
      productionServerChecks.push("Missing APP_PAYMENT_WEBHOOK_URL in env file (webhook/worker target endpoint).");
    }
    if (paymentProvider === "stripe") {
      if (!hasValue(env, "STRIPE_SECRET_KEY")) {
        productionServerChecks.push("Missing STRIPE_SECRET_KEY in env file for Stripe production.");
      }
      if (!hasValue(env, "STRIPE_WEBHOOK_SECRET")) {
        productionServerChecks.push("Missing STRIPE_WEBHOOK_SECRET in env file for Stripe production.");
      }
    }
  }

  [
    "VITE_SUPABASE_URL",
    "VITE_EMAIL_WEBHOOK_URL",
    "VITE_PHOTO_WEBHOOK_URL",
    "VITE_MAP_WEBHOOK_URL",
    "VITE_PAYMENT_WEBHOOK_URL",
    "APP_PAYMENT_WEBHOOK_URL"
  ].forEach((key) => {
    if (hasValue(env, key) && !validateUrl(env[key])) {
      errors.push(`${key} must be a valid http/https URL.`);
    }
    if (runtimeEnv === "production" && hasValue(env, key) && String(env[key]).startsWith("http://")) {
      errors.push(`${key} must use https in production.`);
    }
    if (runtimeEnv === "production" && hasValue(env, key) && /localhost|127\.0\.0\.1/i.test(String(env[key]))) {
      errors.push(`${key} must not point to localhost in production.`);
    }
  });

  if (runtimeEnv === "production" && paymentProvider === "stripe") {
    const publishableKey = String(env.VITE_STRIPE_PUBLISHABLE_KEY || "");
    const secretKey = String(env.STRIPE_SECRET_KEY || "");
    if (publishableKey.startsWith("pk_test_")) {
      errors.push("VITE_STRIPE_PUBLISHABLE_KEY must be a live key (pk_live_) in production.");
    }
    if (secretKey.startsWith("sk_test_")) {
      errors.push("STRIPE_SECRET_KEY must be a live key (sk_live_) in production.");
    }
  }

  return { runtimeEnv, errors, warnings };
}

function main() {
  const envFileArg = getArgValue("env-file");
  const envFile = envFileArg || ".env";
  const expectedRuntime = parseExpectedRuntime(getArgValue("expected-runtime"));
  const envPath = path.isAbsolute(envFile) ? envFile : path.resolve(PROJECT_ROOT, envFile);
  if (!existsSync(envPath)) {
    throw new Error(`Env file not found: ${envPath}`);
  }

  const env = parseEnvFile(envPath);
  const inferredRuntime = normalizeRuntimeEnv(env.VITE_RUNTIME_ENV);
  const strictMode = hasFlag("strict") || expectedRuntime === "production" || inferredRuntime === "production";
  const { runtimeEnv, errors, warnings } = runValidation(env, {
    strictMode,
    expectedRuntime
  });

  console.log(`[env-check] File: ${envPath}`);
  console.log(`[env-check] Runtime: ${runtimeEnv}`);
  if (errors.length === 0) {
    console.log("[env-check] Critical checks passed.");
  } else {
    console.log("[env-check] Critical issues:");
    errors.forEach((issue) => console.log(` - ${issue}`));
  }

  if (warnings.length) {
    console.log("[env-check] Warnings:");
    warnings.forEach((issue) => console.log(` - ${issue}`));
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(`[env-check] ${error instanceof Error ? error.message : "Unexpected error."}`);
  process.exit(1);
}
