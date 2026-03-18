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

export const appEnv = {
  dataProvider: normalizeProvider(getEnvValue("VITE_DATA_PROVIDER", "local"), "local"),
  authProvider: normalizeProvider(getEnvValue("VITE_AUTH_PROVIDER", "local"), "local"),
  supabaseUrl: getEnvValue("VITE_SUPABASE_URL", ""),
  supabaseAnonKey: getEnvValue("VITE_SUPABASE_ANON_KEY", ""),
  emailTransport: getEnvValue("VITE_EMAIL_TRANSPORT", "mock"),
  emailWebhookUrl: getEnvValue("VITE_EMAIL_WEBHOOK_URL", ""),
  photoStorageProvider: getEnvValue("VITE_PHOTO_STORAGE_PROVIDER", "placeholder"),
  photoWebhookUrl: getEnvValue("VITE_PHOTO_WEBHOOK_URL", "")
};

export function isSupabaseConfigured() {
  return Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
}
