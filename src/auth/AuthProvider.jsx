import { createContext, useEffect, useMemo, useState } from "react";
import { createAuthRepository } from "./authRepository";
import { canAccessRole } from "./roles";

export const AuthContext = createContext(null);

const authRepository = createAuthRepository();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const currentSession = await authRepository.getSession();
      if (!isMounted) {
        return;
      }

      setSession(currentSession);
      setIsAuthLoading(false);
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof authRepository.subscribe !== "function") {
      return undefined;
    }

    const unsubscribe = authRepository.subscribe((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!session?.expires_at) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const expiresAtMs = new Date(session.expires_at).getTime();
      if (!Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now()) {
        setSession(null);
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [session?.expires_at]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      isAuthLoading,
      sessionExpiresAt: session?.expires_at ?? null,
      sessionExpiringSoon:
        session?.expires_at != null ? new Date(session.expires_at).getTime() - Date.now() < 15 * 60 * 1000 : false,
      authMode: authRepository.mode,
      userType: session?.user?.user_type ?? null,
      isCustomerUser: session?.user?.user_type === "customer",
      isInternalUser: (session?.user?.user_type ?? "internal") === "internal",
      defaultHomePath: session?.user?.user_type === "customer" ? "/portal" : "/",

      async login(payload) {
        const result = await authRepository.login(payload);
        if (result.ok) {
          setSession(result.session);
        }

        return result;
      },

      async logout() {
        const result = await authRepository.logout();
        if (result.ok) {
          setSession(null);
        }
        return result;
      },

      canAccess(allowedRoles = []) {
        return canAccessRole(session?.user?.role, allowedRoles);
      },

      canAccessUserType(allowedUserTypes = []) {
        if (!allowedUserTypes?.length) {
          return true;
        }

        return allowedUserTypes.includes(session?.user?.user_type ?? "internal");
      }
    }),
    [isAuthLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
