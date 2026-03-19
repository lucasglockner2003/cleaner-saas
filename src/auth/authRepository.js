import { appEnv } from "../config/env";
import { getSupabaseClient } from "../lib/supabase/client";
import { createLocalStorageDataSource } from "../persistence/dataSource/localStorageDataSource";
import { localAuthUsers } from "./localUsers";
import { ROLES } from "./roles";

function createLocalAuthRepository() {
  const storage = createLocalStorageDataSource();

  return {
    mode: "local",

    async getSession() {
      const session = storage.readAuthSession();
      if (!session?.user) {
        return null;
      }

      if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
        storage.writeAuthSession(null);
        return null;
      }

      return session;
    },

    async login({ email, password, audience = "any" }) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const user = localAuthUsers.find((item) => item.email.toLowerCase() === normalizedEmail);

      if (!user || user.password !== password) {
        return {
          ok: false,
          error: "Invalid email or password."
        };
      }

      const userType = user.user_type || "internal";
      if (audience === "internal" && userType !== "internal") {
        return {
          ok: false,
          error: "Use the customer portal login for this account."
        };
      }

      if (audience === "portal" && userType !== "customer") {
        return {
          ok: false,
          error: "This account does not have customer portal access."
        };
      }

      const session = {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          user_type: userType,
          client_id: user.client_id ?? null,
          portal_account_id: user.portal_account_id ?? null
        },
        token: `local-${Date.now()}`,
        provider: "local",
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      };

      storage.writeAuthSession(session);

      return {
        ok: true,
        session
      };
    },

    async logout() {
      storage.writeAuthSession(null);
      return {
        ok: true
      };
    },

    subscribe() {
      return () => {};
    }
  };
}

function mapSupabaseUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    role: user.user_metadata?.role || ROLES.OPS,
    user_type: user.user_metadata?.user_type || "internal",
    client_id: user.user_metadata?.client_id || null,
    portal_account_id: user.user_metadata?.portal_account_id || null
  };
}

function createSupabaseAuthRepository() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  function toSessionExpiryIso(session) {
    if (!session?.expires_at) {
      return null;
    }

    const ms = Number(session.expires_at) * 1000;
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }

  return {
    mode: "supabase",

    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return null;
      }

      const session = data?.session;
      if (!session) {
        return null;
      }

      return {
        token: session.access_token,
        provider: "supabase",
        expires_at: toSessionExpiryIso(session),
        user: mapSupabaseUser(session.user)
      };
    },

    async login({ email, password, audience = "any" }) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data?.session) {
        return {
          ok: false,
          error: error?.message || "Login failed."
        };
      }

      const mappedUser = mapSupabaseUser(data.session.user);
      if (audience === "internal" && mappedUser.user_type !== "internal") {
        return {
          ok: false,
          error: "Use the customer portal login for this account."
        };
      }
      if (audience === "portal" && mappedUser.user_type !== "customer") {
        return {
          ok: false,
          error: "This account does not have customer portal access."
        };
      }

      return {
        ok: true,
        session: {
          token: data.session.access_token,
          provider: "supabase",
          expires_at: toSessionExpiryIso(data.session),
          user: mappedUser
        }
      };
    },

    async logout() {
      const { error } = await supabase.auth.signOut();

      return {
        ok: !error,
        error: error?.message ?? null
      };
    },

    subscribe(listener) {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          listener(null);
          return;
        }

        listener({
          token: session.access_token,
          provider: "supabase",
          expires_at: toSessionExpiryIso(session),
          user: mapSupabaseUser(session.user)
        });
      });

      return () => subscription.unsubscribe();
    }
  };
}

export function createAuthRepository() {
  if (appEnv.authProvider === "supabase") {
    const supabaseRepo = createSupabaseAuthRepository();
    if (supabaseRepo) {
      return supabaseRepo;
    }
  }

  return createLocalAuthRepository();
}
