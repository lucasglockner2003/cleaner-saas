import { createClient } from "@supabase/supabase-js";
import { appEnv, isSupabaseConfigured } from "../../config/env";

let supabaseClientSingleton = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClientSingleton) {
    supabaseClientSingleton = createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return supabaseClientSingleton;
}

