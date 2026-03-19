function getEnvValue(key, fallback = "") {
  const value = import.meta.env?.[key];
  if (value == null || value === "") {
    return fallback;
  }

  return String(value);
}

function normalizeProvider(value, fallback) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "supabase" || normalized === "local") {
    return normalized;
  }

  return fallback;
}

function normalizeMapProvider(value, fallback = "mock") {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "mock" || normalized === "webhook") {
    return normalized;
  }

  return fallback;
}

function normalizePaymentProvider(value, fallback = "manual") {
  const normalized = String(value || "").toLowerCase();
  if (["manual", "stripe", "paypal", "subscription_billing"].includes(normalized)) {
    return normalized;
  }

  return fallback;
}

function normalizeRuntimeEnv(value, fallback = "local") {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "local" || normalized === "staging" || normalized === "production") {
    return normalized;
  }
  return fallback;
}

function isValidUrl(value) {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

export const appEnv = {
  runtimeEnv: normalizeRuntimeEnv(getEnvValue("VITE_RUNTIME_ENV", "local"), "local"),
  dataProvider: normalizeProvider(getEnvValue("VITE_DATA_PROVIDER", "local"), "local"),
  authProvider: normalizeProvider(getEnvValue("VITE_AUTH_PROVIDER", "local"), "local"),
  organizationId: getEnvValue("VITE_ORGANIZATION_ID", "org-default"),
  supabaseUrl: getEnvValue("VITE_SUPABASE_URL", ""),
  supabaseAnonKey: getEnvValue("VITE_SUPABASE_ANON_KEY", ""),
  emailTransport: getEnvValue("VITE_EMAIL_TRANSPORT", "mock"),
  emailWebhookUrl: getEnvValue("VITE_EMAIL_WEBHOOK_URL", ""),
  photoStorageProvider: getEnvValue("VITE_PHOTO_STORAGE_PROVIDER", "placeholder"),
  photoWebhookUrl: getEnvValue("VITE_PHOTO_WEBHOOK_URL", ""),
  mapProvider: normalizeMapProvider(getEnvValue("VITE_MAP_PROVIDER", "mock")),
  mapWebhookUrl: getEnvValue("VITE_MAP_WEBHOOK_URL", ""),
  paymentProvider: normalizePaymentProvider(getEnvValue("VITE_PAYMENT_PROVIDER", "manual")),
  paymentWebhookUrl: getEnvValue("VITE_PAYMENT_WEBHOOK_URL", ""),
  paymentGatewayAuthToken: getEnvValue("VITE_PAYMENT_GATEWAY_AUTH_TOKEN", ""),
  stripePublishableKey: getEnvValue("VITE_STRIPE_PUBLISHABLE_KEY", "")
};

export function isSupabaseConfigured() {
  return Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
}

export function getRuntimeConfigReport() {
  const criticalIssues = [];
  const warnings = [];
  const trackedUrls = [
    { key: "VITE_SUPABASE_URL", value: appEnv.supabaseUrl },
    { key: "VITE_EMAIL_WEBHOOK_URL", value: appEnv.emailWebhookUrl },
    { key: "VITE_PHOTO_WEBHOOK_URL", value: appEnv.photoWebhookUrl },
    { key: "VITE_MAP_WEBHOOK_URL", value: appEnv.mapWebhookUrl },
    { key: "VITE_PAYMENT_WEBHOOK_URL", value: appEnv.paymentWebhookUrl }
  ];

  if (appEnv.dataProvider === "supabase" && !isSupabaseConfigured()) {
    criticalIssues.push("Supabase data provider is enabled but URL/Anon key is missing.");
  }

  if (appEnv.authProvider === "supabase" && !isSupabaseConfigured()) {
    criticalIssues.push("Supabase auth provider is enabled but URL/Anon key is missing.");
  }

  if (appEnv.runtimeEnv === "production") {
    if (appEnv.dataProvider !== "supabase") {
      criticalIssues.push("Production runtime requires `VITE_DATA_PROVIDER=supabase`.");
    }
    if (appEnv.authProvider !== "supabase") {
      criticalIssues.push("Production runtime requires `VITE_AUTH_PROVIDER=supabase`.");
    }
  }

  if (!appEnv.organizationId || appEnv.organizationId === "org-default") {
    if (appEnv.runtimeEnv === "production") {
      criticalIssues.push("`VITE_ORGANIZATION_ID` cannot remain default in production.");
    } else {
      warnings.push("`VITE_ORGANIZATION_ID` is default/missing; set a real tenant id for production.");
    }
  }

  if (appEnv.emailTransport === "webhook" && !appEnv.emailWebhookUrl) {
    criticalIssues.push("Email transport is webhook but `VITE_EMAIL_WEBHOOK_URL` is missing.");
  }

  if (appEnv.photoStorageProvider === "webhook" && !appEnv.photoWebhookUrl) {
    criticalIssues.push("Photo storage provider is webhook but `VITE_PHOTO_WEBHOOK_URL` is missing.");
  }

  if (appEnv.mapProvider === "webhook" && !appEnv.mapWebhookUrl) {
    criticalIssues.push("Map provider is webhook but `VITE_MAP_WEBHOOK_URL` is missing.");
  }

  if (appEnv.paymentProvider !== "manual" && !appEnv.paymentWebhookUrl) {
    criticalIssues.push("Provider-backed payments require `VITE_PAYMENT_WEBHOOK_URL`.");
  }
  if (appEnv.paymentProvider !== "manual" && !appEnv.paymentGatewayAuthToken) {
    criticalIssues.push("Provider-backed payments require `VITE_PAYMENT_GATEWAY_AUTH_TOKEN`.");
  }

  if (appEnv.paymentProvider === "stripe") {
    if (!appEnv.stripePublishableKey) {
      criticalIssues.push("Stripe payment mode requires `VITE_STRIPE_PUBLISHABLE_KEY`.");
    }
    if (appEnv.stripePublishableKey && !appEnv.stripePublishableKey.startsWith("pk_")) {
      warnings.push("`VITE_STRIPE_PUBLISHABLE_KEY` is present but does not look like a Stripe publishable key.");
    }
    if (appEnv.runtimeEnv === "production" && appEnv.stripePublishableKey.startsWith("pk_test_")) {
      criticalIssues.push("Stripe production runtime requires a live publishable key (`pk_live_...`).");
    }
  }

  trackedUrls.forEach((entry) => {
    if (!entry.value) {
      return;
    }
    if (!isValidUrl(entry.value)) {
      criticalIssues.push(`${entry.key} is not a valid URL.`);
      return;
    }
    if (appEnv.runtimeEnv === "production" && entry.value.startsWith("http://")) {
      criticalIssues.push(`${entry.key} must use HTTPS in production.`);
    }
    if (appEnv.runtimeEnv === "production" && /localhost|127\.0\.0\.1/i.test(entry.value)) {
      criticalIssues.push(`${entry.key} must not point to localhost in production.`);
    }
  });

  if (!["local", "staging", "production"].includes(appEnv.runtimeEnv)) {
    warnings.push("`VITE_RUNTIME_ENV` should be local, staging, or production.");
  }

  return {
    isLaunchReady: criticalIssues.length === 0,
    criticalIssues,
    warnings
  };
}
