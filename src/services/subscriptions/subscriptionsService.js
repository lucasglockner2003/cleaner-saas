import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CANCELLED: "cancelled",
  TRIAL: "trial",
  EXPIRED: "expired"
};

export const BILLING_CYCLE = {
  WEEKLY: "weekly",
  FORTNIGHTLY: "fortnightly",
  MONTHLY: "monthly"
};

const DAYS_BY_CYCLE = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30
};

function normalizeCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizePlanPayload(payload = {}) {
  return {
    code: safeTrim(payload.code).toUpperCase(),
    name: safeTrim(payload.name),
    tier: safeTrim(payload.tier).toLowerCase() || "standard",
    billing_cycle: safeTrim(payload.billing_cycle).toLowerCase() || BILLING_CYCLE.MONTHLY,
    currency: safeTrim(payload.currency).toUpperCase() || "NZD",
    price: normalizeCurrency(payload.price),
    included_service_type_ids: Array.isArray(payload.included_service_type_ids)
      ? payload.included_service_type_ids.filter(Boolean)
      : [],
    visit_quota_per_cycle: Number(payload.visit_quota_per_cycle ?? 1),
    discount_pct: Number(payload.discount_pct ?? 0),
    auto_invoice: payload.auto_invoice !== false,
    active: payload.active !== false,
    description: safeTrim(payload.description)
  };
}

function normalizeClientSubscriptionPayload(payload = {}) {
  return {
    client_id: safeTrim(payload.client_id),
    plan_id: safeTrim(payload.plan_id),
    status: safeTrim(payload.status).toLowerCase() || SUBSCRIPTION_STATUS.ACTIVE,
    start_date: safeTrim(payload.start_date) || new Date().toISOString().slice(0, 10),
    end_date: safeTrim(payload.end_date) || null,
    next_billing_date: safeTrim(payload.next_billing_date) || null,
    billing_anchor_day: safeTrim(payload.billing_anchor_day) || null,
    auto_renew: payload.auto_renew !== false,
    payment_provider: safeTrim(payload.payment_provider) || "manual",
    payment_method_hint: safeTrim(payload.payment_method_hint) || "bank_transfer",
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}
  };
}

function validatePlanPayload(db, payload = {}, options = {}) {
  const normalized = normalizePlanPayload(payload);
  const errors = {};

  if (!normalized.code || normalized.code.length < 4) {
    errors.code = "Plan code must contain at least 4 characters.";
  }

  if (!normalized.name || normalized.name.length < 3) {
    errors.name = "Plan name must contain at least 3 characters.";
  }

  if (!Object.values(BILLING_CYCLE).includes(normalized.billing_cycle)) {
    errors.billing_cycle = "Unsupported billing cycle.";
  }

  if (Number.isNaN(normalized.price) || normalized.price <= 0) {
    errors.price = "Plan price must be greater than zero.";
  }

  if (Number.isNaN(normalized.visit_quota_per_cycle) || normalized.visit_quota_per_cycle < 1) {
    errors.visit_quota_per_cycle = "Visit quota must be at least 1.";
  }

  if (Number.isNaN(normalized.discount_pct) || normalized.discount_pct < 0 || normalized.discount_pct > 80) {
    errors.discount_pct = "Discount must be between 0 and 80.";
  }

  const duplicate = (db.subscriptionPlans ?? []).find((plan) => {
    if (options.planId && plan.id === options.planId) {
      return false;
    }

    return plan.code === normalized.code;
  });

  if (duplicate) {
    errors.code = "Plan code already exists.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

function validateClientSubscriptionPayload(db, payload = {}) {
  const normalized = normalizeClientSubscriptionPayload(payload);
  const errors = {};

  if (!normalized.client_id || !(db.clients ?? []).some((client) => client.id === normalized.client_id)) {
    errors.client_id = "Valid client is required.";
  }

  if (!normalized.plan_id || !(db.subscriptionPlans ?? []).some((plan) => plan.id === normalized.plan_id)) {
    errors.plan_id = "Valid plan is required.";
  }

  if (!Object.values(SUBSCRIPTION_STATUS).includes(normalized.status)) {
    errors.status = "Invalid subscription status.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

function enrichSubscription(db, subscription) {
  const client = findById(db.clients ?? [], subscription.client_id);
  const plan = findById(db.subscriptionPlans ?? [], subscription.plan_id);
  const activeRecurring = (db.recurringServices ?? []).find(
    (item) => item.client_id === subscription.client_id && item.status === "active"
  );

  return {
    ...subscription,
    client_name: client?.full_name ?? "-",
    client_suburb: client?.suburb ?? "-",
    plan_name: plan?.name ?? "-",
    plan_tier: plan?.tier ?? "standard",
    plan_price: plan?.price ?? 0,
    billing_cycle: plan?.billing_cycle ?? subscription.billing_cycle ?? BILLING_CYCLE.MONTHLY,
    has_active_recurring: Boolean(activeRecurring)
  };
}

function monthlyEquivalent(plan) {
  if (!plan) {
    return 0;
  }

  if (plan.billing_cycle === BILLING_CYCLE.WEEKLY) {
    return normalizeCurrency(plan.price * 4.33);
  }

  if (plan.billing_cycle === BILLING_CYCLE.FORTNIGHTLY) {
    return normalizeCurrency(plan.price * 2.16);
  }

  return normalizeCurrency(plan.price);
}

export function listSubscriptionPlans(db, filters = {}) {
  const { activeOnly = false } = filters;

  return (db.subscriptionPlans ?? [])
    .filter((plan) => (activeOnly ? plan.active : true))
    .sort((a, b) => a.price - b.price);
}

export function listClientSubscriptions(db, filters = {}) {
  const { status = "all", clientId = "all" } = filters;
  return (db.clientSubscriptions ?? [])
    .filter((row) => (status === "all" ? true : row.status === status))
    .filter((row) => (clientId === "all" ? true : row.client_id === clientId))
    .map((row) => enrichSubscription(db, row))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createSubscriptionPlan(db, payload = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.subscriptionPlans) {
    mutable.subscriptionPlans = [];
  }

  const validation = validatePlanPayload(mutable, payload);
  if (!validation.isValid) {
    return {
      db,
      ok: false,
      errors: validation.errors,
      message: "Plan validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  mutable.subscriptionPlans.push({
    id: buildNextId(mutable.subscriptionPlans, "sp-"),
    organization_id: appEnv.organizationId,
    ...validation.normalized,
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    ok: true,
    message: "Subscription plan created.",
    errors: {}
  };
}

export function assignClientSubscription(db, payload = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.clientSubscriptions) {
    mutable.clientSubscriptions = [];
  }

  const validation = validateClientSubscriptionPayload(mutable, payload);
  if (!validation.isValid) {
    return {
      db,
      ok: false,
      errors: validation.errors,
      message: "Subscription assignment validation failed."
    };
  }

  const normalized = validation.normalized;
  const existingActive = (mutable.clientSubscriptions ?? []).find(
    (item) =>
      item.client_id === normalized.client_id &&
      [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.PAUSED].includes(item.status)
  );
  if (existingActive) {
    return {
      db,
      ok: false,
      message: "Client already has an active/paused subscription assignment."
    };
  }

  const plan = findById(mutable.subscriptionPlans ?? [], normalized.plan_id);
  const cycle = plan?.billing_cycle ?? BILLING_CYCLE.MONTHLY;
  const nextBillingDate =
    normalized.next_billing_date || addDays(normalized.start_date, DAYS_BY_CYCLE[cycle] ?? DAYS_BY_CYCLE.monthly);
  const nowIso = new Date().toISOString();

  mutable.clientSubscriptions.push({
    id: buildNextId(mutable.clientSubscriptions, "cs-"),
    organization_id: appEnv.organizationId,
    ...normalized,
    next_billing_date: nextBillingDate,
    billing_anchor_day: normalized.billing_anchor_day || normalized.start_date.slice(-2),
    last_invoice_id: null,
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    ok: true,
    message: "Client subscription assigned.",
    errors: {}
  };
}

export function setClientSubscriptionStatus(db, subscriptionId, status) {
  const mutable = cloneDatabase(db);
  const index = (mutable.clientSubscriptions ?? []).findIndex((item) => item.id === subscriptionId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Client subscription not found."
    };
  }

  if (!Object.values(SUBSCRIPTION_STATUS).includes(status)) {
    return {
      db,
      ok: false,
      message: "Invalid subscription status."
    };
  }

  const current = mutable.clientSubscriptions[index];
  mutable.clientSubscriptions[index] = {
    ...current,
    status,
    end_date: status === SUBSCRIPTION_STATUS.CANCELLED ? new Date().toISOString().slice(0, 10) : current.end_date,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: `Subscription marked as ${status}.`
  };
}

export function getSubscriptionRevenueSummary(db) {
  const plansById = (db.subscriptionPlans ?? []).reduce((acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  }, {});
  const subscriptions = listClientSubscriptions(db);
  const activeSubscriptions = subscriptions.filter((row) =>
    [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(row.status)
  );

  const mrr = normalizeCurrency(
    activeSubscriptions.reduce((total, row) => total + monthlyEquivalent(plansById[row.plan_id]), 0)
  );
  const arr = normalizeCurrency(mrr * 12);

  const byTier = activeSubscriptions.reduce((acc, row) => {
    const tier = row.plan_tier || "standard";
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalPlans: (db.subscriptionPlans ?? []).length,
    activePlans: (db.subscriptionPlans ?? []).filter((plan) => plan.active).length,
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: activeSubscriptions.length,
    pausedSubscriptions: subscriptions.filter((row) => row.status === SUBSCRIPTION_STATUS.PAUSED).length,
    cancelledSubscriptions: subscriptions.filter((row) => row.status === SUBSCRIPTION_STATUS.CANCELLED).length,
    mrr,
    arr,
    byTier
  };
}

export function getClientSubscriptionSnapshot(db, clientId) {
  const rows = listClientSubscriptions(db, { clientId });
  const active =
    rows.find((row) => [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(row.status)) ??
    rows.find((row) => row.status === SUBSCRIPTION_STATUS.PAUSED) ??
    null;

  return {
    active,
    all: rows
  };
}
