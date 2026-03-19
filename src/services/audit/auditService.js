import { buildNextId, cloneDatabase, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";

export const AUDIT_OUTCOME = {
  SUCCESS: "success",
  FAILURE: "failure"
};

export const AUDIT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error"
};

function ensureCollection(mutable) {
  if (!mutable.auditEvents) {
    mutable.auditEvents = [];
  }
}

export function appendAuditEvent(db, payload = {}) {
  const mutable = cloneDatabase(db);
  ensureCollection(mutable);

  const nowIso = new Date().toISOString();
  mutable.auditEvents.push({
    id: buildNextId(mutable.auditEvents, "ae-"),
    organization_id: appEnv.organizationId,
    action_key: safeTrim(payload.action_key) || "unknown_action",
    entity_type: safeTrim(payload.entity_type) || null,
    entity_id: safeTrim(payload.entity_id) || null,
    outcome: safeTrim(payload.outcome) || AUDIT_OUTCOME.SUCCESS,
    severity: safeTrim(payload.severity) || AUDIT_SEVERITY.INFO,
    actor_id: safeTrim(payload.actor_id) || "system",
    actor_role: safeTrim(payload.actor_role) || "system",
    message: safeTrim(payload.message) || "",
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    created_at: nowIso
  });

  return {
    db: mutable,
    ok: true
  };
}

export function listAuditEvents(db, filters = {}) {
  const { outcome = "all", actionKey = "all" } = filters;
  return (db.auditEvents ?? [])
    .filter((event) => (outcome === "all" ? true : event.outcome === outcome))
    .filter((event) => (actionKey === "all" ? true : event.action_key === actionKey))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getAuditSummary(db) {
  const rows = db.auditEvents ?? [];
  const failures = rows.filter((event) => event.outcome === AUDIT_OUTCOME.FAILURE).length;
  const warnings = rows.filter((event) => event.severity === AUDIT_SEVERITY.WARNING).length;
  const errors = rows.filter((event) => event.severity === AUDIT_SEVERITY.ERROR).length;

  return {
    total: rows.length,
    failures,
    warnings,
    errors
  };
}
