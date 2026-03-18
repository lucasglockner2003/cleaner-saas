import { getSupabaseClient } from "../../lib/supabase/client";
import { DB_COLLECTION_TO_TABLE } from "../tableMap";

async function fetchTableRows(client, tableName) {
  const { data, error } = await client.from(tableName).select("*");
  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(`${tableName}: ${error.message}`);
  }

  return data ?? [];
}

async function upsertTableRows(client, tableName, rows) {
  if (!rows.length) {
    return;
  }

  const { error } = await client.from(tableName).upsert(rows, { onConflict: "id" });
  if (error) {
    if (error.code === "42P01") {
      return;
    }
    throw new Error(`${tableName}: ${error.message}`);
  }
}

export function createSupabaseDataSource() {
  const client = getSupabaseClient();

  return {
    mode: "supabase",
    name: "supabase",
    isAvailable: Boolean(client),

    async loadState() {
      if (!client) {
        return {
          ok: false,
          db: null,
          error: "Supabase client is not configured."
        };
      }

      try {
        const entries = await Promise.all(
          Object.entries(DB_COLLECTION_TO_TABLE).map(async ([collectionKey, tableName]) => {
            const rows = await fetchTableRows(client, tableName);
            return [collectionKey, rows];
          })
        );

        const db = entries.reduce((acc, [collectionKey, rows]) => {
          acc[collectionKey] = rows;
          return acc;
        }, {});

        return {
          ok: true,
          db,
          from: "supabase"
        };
      } catch (error) {
        return {
          ok: false,
          db: null,
          error: error instanceof Error ? error.message : "Supabase load failed."
        };
      }
    },

    async saveState(db, persistPlan = null) {
      if (!client) {
        return {
          ok: false,
          error: "Supabase client is not configured."
        };
      }

      try {
        const collections = persistPlan?.collections?.length
          ? persistPlan.collections
          : Object.keys(DB_COLLECTION_TO_TABLE);

        for (const collectionKey of collections) {
          const tableName = DB_COLLECTION_TO_TABLE[collectionKey];
          if (!tableName) {
            continue;
          }

          const rows = db[collectionKey] ?? [];
          await upsertTableRows(client, tableName, rows);
        }

        return {
          ok: true
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Supabase save failed."
        };
      }
    }
  };
}
