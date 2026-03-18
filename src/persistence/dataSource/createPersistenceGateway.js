import { appEnv } from "../../config/env";
import { createLocalStorageDataSource } from "./localStorageDataSource";
import { createSupabaseDataSource } from "./supabaseDataSource";

function hasAnyRows(db) {
  if (!db || typeof db !== "object") {
    return false;
  }

  return Object.values(db).some((collection) => Array.isArray(collection) && collection.length > 0);
}

export function createPersistenceGateway() {
  const localSource = createLocalStorageDataSource();
  const supabaseSource = createSupabaseDataSource();
  const requestedProvider = appEnv.dataProvider;
  const useSupabase = requestedProvider === "supabase" && supabaseSource.isAvailable;

  return {
    mode: useSupabase ? "supabase" : "local",
    requestedProvider,
    localSource,

    async loadState(seedFactory) {
      if (useSupabase) {
        const remote = await supabaseSource.loadState();
        if (remote.ok && hasAnyRows(remote.db)) {
          await localSource.saveState(remote.db);
          return {
            ...remote,
            provider: "supabase"
          };
        }
      }

      const local = await localSource.loadState();
      if (local.ok && local.db) {
        return {
          ...local,
          provider: "local"
        };
      }

      const seeded = seedFactory();
      await localSource.saveState(seeded);

      if (useSupabase) {
        await supabaseSource.saveState(seeded);
      }

      return {
        ok: true,
        db: seeded,
        provider: "seed"
      };
    },

    async saveState(db, persistPlan = null) {
      const localResult = await localSource.saveState(db);

      if (useSupabase) {
        const remoteResult = await supabaseSource.saveState(db, persistPlan);
        if (!remoteResult.ok) {
          return {
            ok: false,
            error: remoteResult.error,
            fallback: localResult.ok ? "local-only" : "none"
          };
        }
      }

      return {
        ok: localResult.ok,
        error: localResult.error ?? null
      };
    }
  };
}

