const STORAGE_KEY = "cleaner_ops_db_v2";
const AUTH_STORAGE_KEY = "cleaner_ops_auth_session_v1";

export function createLocalStorageDataSource() {
  return {
    mode: "local",
    name: "local-storage",

    async loadState() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return {
            ok: true,
            db: null,
            from: "empty"
          };
        }

        return {
          ok: true,
          db: JSON.parse(raw),
          from: "local-storage"
        };
      } catch (error) {
        return {
          ok: false,
          db: null,
          error: error instanceof Error ? error.message : "Failed to load local state."
        };
      }
    },

    async saveState(db) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        return {
          ok: true
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save local state."
        };
      }
    },

    clearState() {
      window.localStorage.removeItem(STORAGE_KEY);
    },

    readAuthSession() {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch (_error) {
        return null;
      }
    },

    writeAuthSession(value) {
      if (!value) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
    }
  };
}

