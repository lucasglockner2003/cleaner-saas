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

export const appEnv = {
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

  if (appEnv.dataProvider === "supabase" && !isSupabaseConfigured()) {
    criticalIssues.push("Supabase data provider is enabled but URL/Anon key is missing.");
  }

  if (appEnv.authProvider === "supabase" && !isSupabaseConfigured()) {
    criticalIssues.push("Supabase auth provider is enabled but URL/Anon key is missing.");
  }

  if (!appEnv.organizationId || appEnv.organizationId === "org-default") {
    warnings.push("`VITE_ORGANIZATION_ID` is default/missing; set a real tenant id for production.");
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

  if (appEnv.paymentProvider === "stripe") {
    if (!appEnv.stripePublishableKey) {
      criticalIssues.push("Stripe payment mode requires `VITE_STRIPE_PUBLISHABLE_KEY`.");
    }
    if (!appEnv.paymentGatewayAuthToken) {
      warnings.push("`VITE_PAYMENT_GATEWAY_AUTH_TOKEN` is missing; gateway calls are unauthenticated.");
    }
  }

  return {
    isLaunchReady: criticalIssues.length === 0,
    criticalIssues,
    warnings
  };
}
