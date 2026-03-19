import { appEnv } from "../../config/env";
import { getSupabaseClient } from "../../lib/supabase/client";
import { DB_COLLECTION_TO_TABLE } from "../tableMap";

const COLLECTION_STRATEGIES = {
  clients: { tenantScoped: true, reconcile: true, pruneMissing: false },
  scheduleDays: { tenantScoped: true, reconcile: true, pruneMissing: false },
  scheduledVisits: { tenantScoped: true, reconcile: true, pruneMissing: false },
  products: { tenantScoped: true, reconcile: true, pruneMissing: false },
  teams: { tenantScoped: true, reconcile: true, pruneMissing: false },
  employees: { tenantScoped: true, reconcile: true, pruneMissing: false },
  invoices: { tenantScoped: true, reconcile: true, pruneMissing: false },
  payments: { tenantScoped: true, reconcile: true, pruneMissing: false },
  paymentEvents: { tenantScoped: true, reconcile: true, pruneMissing: false },
  subscriptionPlans: { tenantScoped: true, reconcile: true, pruneMissing: true },
  clientSubscriptions: { tenantScoped: true, reconcile: true, pruneMissing: true },
  crmProfiles: { tenantScoped: true, reconcile: true, pruneMissing: true },
  referrals: { tenantScoped: true, reconcile: true, pruneMissing: false },
  growthCampaigns: { tenantScoped: true, reconcile: true, pruneMissing: false },
  operationJobs: { tenantScoped: true, reconcile: true, pruneMissing: false },
  auditEvents: { tenantScoped: true, reconcile: true, pruneMissing: false }
};

function getCollectionStrategy(collectionKey, persistPlan = null) {
  const base = COLLECTION_STRATEGIES[collectionKey] ?? {
    tenantScoped: true,
    reconcile: false,
    pruneMissing: false
  };

  return {
    ...base,
    pruneMissing: Boolean(base.pruneMissing || persistPlan?.pruneMissing)
  };
}

function isMissingTable(error) {
  return error?.code === "42P01";
}

function isMissingColumn(error) {
  return error?.code === "42703" || error?.code === "PGRST204" || /column .* does not exist/i.test(error?.message || "");
}

function rowTimestampMs(row = {}) {
  const raw = row.updated_at || row.created_at || null;
  if (!raw) {
    return 0;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function mergeRowsByFreshness(localRows = [], remoteRows = []) {
  if (!localRows.every((row) => row?.id) || !remoteRows.every((row) => row?.id)) {
    return {
      rows: remoteRows.length ? remoteRows : localRows,
      remoteWins: 0
    };
  }

  const remoteById = new Map(remoteRows.map((row) => [row.id, row]));
  const merged = [];
  let remoteWins = 0;

  localRows.forEach((localRow) => {
    const remote = remoteById.get(localRow.id);
    if (!remote) {
      merged.push(localRow);
      return;
    }

    remoteById.delete(localRow.id);
    const localTs = rowTimestampMs(localRow);
    const remoteTs = rowTimestampMs(remote);
    const chooseRemote = remoteTs > localTs;

    if (chooseRemote && JSON.stringify(localRow) !== JSON.stringify(remote)) {
      remoteWins += 1;
    }

    merged.push(chooseRemote ? remote : localRow);
  });

  remoteById.forEach((row) => merged.push(row));

  return {
    rows: merged,
    remoteWins
  };
}

async function fetchTableRows(client, tableName, strategy) {
  const tenantScoped = strategy.tenantScoped && Boolean(appEnv.organizationId);

  let query = client.from(tableName).select("*");
  if (tenantScoped) {
    query = query.eq("organization_id", appEnv.organizationId);
  }

  let { data, error } = await query;
  if (error && isMissingColumn(error) && tenantScoped) {
    ({ data, error } = await client.from(tableName).select("*"));
  }

  if (error) {
    if (isMissingTable(error)) {
      return [];
    }
    throw new Error(`${tableName}: ${error.message}`);
  }

  return data ?? [];
}

async function upsertTableRows(client, tableName, rows, strategy) {
  if (!rows.length) {
    return {
      upserted: 0
    };
  }

  const tenantScoped = strategy.tenantScoped && Boolean(appEnv.organizationId);
  const withTenant = tenantScoped
    ? rows.map((row) => ({
        ...row,
        organization_id: row.organization_id || appEnv.organizationId
      }))
    : rows;

  let { error } = await client.from(tableName).upsert(withTenant, { onConflict: "id" });
  if (error && isMissingColumn(error) && tenantScoped) {
    ({ error } = await client.from(tableName).upsert(rows, { onConflict: "id" }));
  }

  if (error) {
    if (isMissingTable(error)) {
      return {
        upserted: 0
      };
    }
    throw new Error(`${tableName}: ${error.message}`);
  }

  return {
    upserted: rows.length
  };
}

async function pruneMissingRows(client, tableName, localRows, strategy) {
  if (!strategy.pruneMissing) {
    return {
      deleted: 0
    };
  }

  const remoteRows = await fetchTableRows(client, tableName, strategy);
  if (!remoteRows.length) {
    return {
      deleted: 0
    };
  }

  const localIds = new Set(localRows.map((row) => row?.id).filter(Boolean));
  const staleIds = remoteRows.map((row) => row?.id).filter(Boolean).filter((id) => !localIds.has(id));

  if (!staleIds.length) {
    return {
      deleted: 0
    };
  }

  const tenantScoped = strategy.tenantScoped && Boolean(appEnv.organizationId);
  let query = client.from(tableName).delete().in("id", staleIds);
  if (tenantScoped) {
    query = query.eq("organization_id", appEnv.organizationId);
  }

  let { error } = await query;
  if (error && isMissingColumn(error) && tenantScoped) {
    ({ error } = await client.from(tableName).delete().in("id", staleIds));
  }

  if (error) {
    if (isMissingTable(error)) {
      return {
        deleted: 0
      };
    }
    throw new Error(`${tableName}: ${error.message}`);
  }

  return {
    deleted: staleIds.length
  };
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
            const strategy = getCollectionStrategy(collectionKey);
            const rows = await fetchTableRows(client, tableName, strategy);
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
        const reconciledDb = {
          ...db
        };
        const stats = {
          tables: 0,
          upserted: 0,
          deleted: 0,
          conflicts: 0
        };

        for (const collectionKey of collections) {
          const tableName = DB_COLLECTION_TO_TABLE[collectionKey];
          if (!tableName) {
            continue;
          }

          const strategy = getCollectionStrategy(collectionKey, persistPlan);
          const localRows = db[collectionKey] ?? [];

          const upsertResult = await upsertTableRows(client, tableName, localRows, strategy);
          stats.upserted += upsertResult.upserted;

          const pruneResult = await pruneMissingRows(client, tableName, localRows, strategy);
          stats.deleted += pruneResult.deleted;

          if (strategy.reconcile) {
            const remoteRows = await fetchTableRows(client, tableName, strategy);
            const mergeResult = mergeRowsByFreshness(localRows, remoteRows);
            reconciledDb[collectionKey] = mergeResult.rows;
            stats.conflicts += mergeResult.remoteWins;
          }

          stats.tables += 1;
        }

        return {
          ok: true,
          reconciledDb,
          stats
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
