import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";

export const LIFECYCLE_STAGE = {
  LEAD: "lead",
  NEW: "new",
  ACTIVE: "active",
  AT_RISK: "at_risk",
  INACTIVE: "inactive",
  REACTIVATION_TARGET: "reactivation_target",
  CHURNED: "churned"
};

export const CHURN_RISK = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

function normalizeCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIsoDate, toIsoDate = todayIso()) {
  if (!fromIsoDate) {
    return null;
  }

  const from = new Date(`${fromIsoDate}T00:00:00.000Z`);
  const to = new Date(`${toIsoDate}T00:00:00.000Z`);
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
}

function deriveLifecycleFromUsage({ completedVisits, daysSinceLastVisit, clientStatus }) {
  if (clientStatus === "inactive") {
    return LIFECYCLE_STAGE.INACTIVE;
  }

  if (completedVisits === 0) {
    return LIFECYCLE_STAGE.LEAD;
  }

  if (daysSinceLastVisit == null) {
    return LIFECYCLE_STAGE.NEW;
  }

  if (daysSinceLastVisit <= 21) {
    return LIFECYCLE_STAGE.ACTIVE;
  }

  if (daysSinceLastVisit <= 45) {
    return LIFECYCLE_STAGE.AT_RISK;
  }

  if (daysSinceLastVisit <= 90) {
    return LIFECYCLE_STAGE.REACTIVATION_TARGET;
  }

  return LIFECYCLE_STAGE.CHURNED;
}

function deriveChurnRisk(daysSinceLastVisit, outstandingBalance, hasOpenRecurring) {
  if (daysSinceLastVisit == null) {
    return CHURN_RISK.MEDIUM;
  }

  let score = 0;
  score += Math.min(40, Math.max(0, daysSinceLastVisit - 14));
  score += outstandingBalance > 0 ? Math.min(30, outstandingBalance / 12) : 0;
  score += hasOpenRecurring ? -20 : 15;

  if (score <= 25) {
    return CHURN_RISK.LOW;
  }
  if (score <= 55) {
    return CHURN_RISK.MEDIUM;
  }
  return CHURN_RISK.HIGH;
}

function deriveVipLevel(totalRevenue) {
  if (totalRevenue >= 1200) {
    return "gold";
  }
  if (totalRevenue >= 700) {
    return "silver";
  }
  return "none";
}

function ensureProfile(db, clientId) {
  const existing = (db.crmProfiles ?? []).find((profile) => profile.client_id === clientId);
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  return {
    id: null,
    organization_id: appEnv.organizationId,
    client_id: clientId,
    lifecycle_stage: LIFECYCLE_STAGE.NEW,
    lead_status: "customer",
    acquisition_source: "manual",
    acquisition_channel: "internal_ops",
    referral_source: "",
    churn_risk: CHURN_RISK.MEDIUM,
    vip_level: "none",
    win_back_eligible: false,
    reactivation_candidate: false,
    upsell_signal: "low",
    deep_clean_interest: "low",
    notes: "",
    created_at: nowIso,
    updated_at: nowIso
  };
}

function buildClientLifecycleRow(db, client) {
  const profile = ensureProfile(db, client.id);
  const completedVisits = (db.scheduledVisits ?? []).filter(
    (visit) => visit.client_id === client.id && visit.status === "completed"
  );
  const invoices = (db.invoices ?? []).filter((invoice) => invoice.client_id === client.id);
  const payments = (db.payments ?? []).filter((payment) => payment.client_id === client.id && payment.status === "captured");
  const recurringActive = (db.recurringServices ?? []).some(
    (item) => item.client_id === client.id && item.status === "active"
  );
  const referralsGenerated = (db.referrals ?? []).filter((row) => row.referrer_client_id === client.id).length;

  const lastVisitDate =
    completedVisits.length > 0
      ? [...completedVisits].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;
  const daysSinceLastVisit = daysBetween(lastVisitDate);
  const visitRevenue = completedVisits.reduce((total, visit) => total + (visit.price ?? 0), 0);
  const invoiceTotal = invoices.reduce((total, invoice) => total + (invoice.total ?? 0), 0);
  const paidTotal = payments.reduce((total, payment) => total + (payment.amount ?? 0), 0);
  const outstandingBalance = invoices.reduce((total, invoice) => total + (invoice.balance_due ?? 0), 0);
  const lifecycleStage = profile.lifecycle_stage || deriveLifecycleFromUsage({
    completedVisits: completedVisits.length,
    daysSinceLastVisit,
    clientStatus: client.status
  });
  const churnRisk = profile.churn_risk || deriveChurnRisk(daysSinceLastVisit, outstandingBalance, recurringActive);
  const vipLevel = profile.vip_level && profile.vip_level !== "none" ? profile.vip_level : deriveVipLevel(visitRevenue);
  const serviceFrequency = client.cleaning_frequency || "Unknown";

  return {
    client_id: client.id,
    client_name: client.full_name,
    suburb: client.suburb,
    client_status: client.status,
    service_frequency: serviceFrequency,
    lifecycle_stage: lifecycleStage,
    lead_status: profile.lead_status || (completedVisits.length > 0 ? "customer" : "lead"),
    acquisition_source: profile.acquisition_source || "unknown",
    acquisition_channel: profile.acquisition_channel || "unknown",
    referral_source: profile.referral_source || "",
    churn_risk: churnRisk,
    vip_level: vipLevel,
    completed_visits: completedVisits.length,
    days_since_last_visit: daysSinceLastVisit,
    total_revenue: normalizeCurrency(Math.max(visitRevenue, invoiceTotal)),
    paid_total: normalizeCurrency(paidTotal),
    outstanding_balance: normalizeCurrency(outstandingBalance),
    recurring_active: recurringActive,
    referrals_generated: referralsGenerated,
    win_back_eligible:
      profile.win_back_eligible ||
      lifecycleStage === LIFECYCLE_STAGE.REACTIVATION_TARGET ||
      lifecycleStage === LIFECYCLE_STAGE.CHURNED,
    reactivation_candidate:
      profile.reactivation_candidate ||
      lifecycleStage === LIFECYCLE_STAGE.REACTIVATION_TARGET ||
      lifecycleStage === LIFECYCLE_STAGE.CHURNED,
    upsell_signal: profile.upsell_signal || (serviceFrequency === "Monthly" ? "high" : "medium"),
    deep_clean_interest: profile.deep_clean_interest || "medium",
    notes: profile.notes || "",
    profile_id: profile.id
  };
}

export function listCustomerLifecycleRows(db, filters = {}) {
  const { stage = "all", risk = "all", source = "all", search = "" } = filters;
  const normalizedSearch = safeTrim(search).toLowerCase();

  return (db.clients ?? [])
    .map((client) => buildClientLifecycleRow(db, client))
    .filter((row) => (stage === "all" ? true : row.lifecycle_stage === stage))
    .filter((row) => (risk === "all" ? true : row.churn_risk === risk))
    .filter((row) => (source === "all" ? true : row.acquisition_source === source))
    .filter((row) => {
      if (!normalizedSearch) {
        return true;
      }

      const target = `${row.client_name} ${row.suburb} ${row.acquisition_source}`.toLowerCase();
      return target.includes(normalizedSearch);
    })
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

export function getLifecycleSummary(db) {
  const rows = listCustomerLifecycleRows(db);
  const leadsFromBookings = (db.bookingRequests ?? []).filter((row) => !row.client_id).length;
  const stageCounts = rows.reduce((acc, row) => {
    acc[row.lifecycle_stage] = (acc[row.lifecycle_stage] ?? 0) + 1;
    return acc;
  }, {});
  const churnCounts = rows.reduce((acc, row) => {
    acc[row.churn_risk] = (acc[row.churn_risk] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalClients: rows.length,
    activeClients: stageCounts.active ?? 0,
    atRiskClients: stageCounts.at_risk ?? 0,
    inactiveClients: (stageCounts.inactive ?? 0) + (stageCounts.churned ?? 0),
    reactivationTargets: stageCounts.reactivation_target ?? 0,
    leads: (stageCounts.lead ?? 0) + leadsFromBookings,
    vipClients: rows.filter((row) => row.vip_level !== "none").length,
    highRiskClients: churnCounts.high ?? 0,
    totalOutstandingBalance: normalizeCurrency(rows.reduce((total, row) => total + row.outstanding_balance, 0)),
    lifetimeRevenue: normalizeCurrency(rows.reduce((total, row) => total + row.total_revenue, 0))
  };
}

export function updateClientLifecycleProfile(db, clientId, payload = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.crmProfiles) {
    mutable.crmProfiles = [];
  }

  const clientExists = (mutable.clients ?? []).some((client) => client.id === clientId);
  if (!clientExists) {
    return {
      db,
      ok: false,
      message: "Client not found."
    };
  }

  const nextStage = safeTrim(payload.lifecycle_stage).toLowerCase();
  const nextRisk = safeTrim(payload.churn_risk).toLowerCase();
  const nextVip = safeTrim(payload.vip_level).toLowerCase();
  const errors = {};

  if (nextStage && !Object.values(LIFECYCLE_STAGE).includes(nextStage)) {
    errors.lifecycle_stage = "Invalid lifecycle stage.";
  }

  if (nextRisk && !Object.values(CHURN_RISK).includes(nextRisk)) {
    errors.churn_risk = "Invalid churn risk.";
  }

  if (nextVip && !["none", "silver", "gold"].includes(nextVip)) {
    errors.vip_level = "Invalid VIP level.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      db,
      ok: false,
      errors,
      message: "Lifecycle update validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  const index = mutable.crmProfiles.findIndex((profile) => profile.client_id === clientId);
  const fallback = ensureProfile(mutable, clientId);
  const nextProfile = {
    ...(index >= 0 ? mutable.crmProfiles[index] : fallback),
    id: index >= 0 ? mutable.crmProfiles[index].id : buildNextId(mutable.crmProfiles, "crm-"),
    organization_id: index >= 0 ? mutable.crmProfiles[index].organization_id || appEnv.organizationId : appEnv.organizationId,
    client_id: clientId,
    lifecycle_stage: nextStage || (index >= 0 ? mutable.crmProfiles[index].lifecycle_stage : fallback.lifecycle_stage),
    lead_status: safeTrim(payload.lead_status) || (index >= 0 ? mutable.crmProfiles[index].lead_status : fallback.lead_status),
    acquisition_source:
      safeTrim(payload.acquisition_source) ||
      (index >= 0 ? mutable.crmProfiles[index].acquisition_source : fallback.acquisition_source),
    acquisition_channel:
      safeTrim(payload.acquisition_channel) ||
      (index >= 0 ? mutable.crmProfiles[index].acquisition_channel : fallback.acquisition_channel),
    referral_source:
      safeTrim(payload.referral_source) ||
      (index >= 0 ? mutable.crmProfiles[index].referral_source : fallback.referral_source),
    churn_risk: nextRisk || (index >= 0 ? mutable.crmProfiles[index].churn_risk : fallback.churn_risk),
    vip_level: nextVip || (index >= 0 ? mutable.crmProfiles[index].vip_level : fallback.vip_level),
    win_back_eligible:
      typeof payload.win_back_eligible === "boolean"
        ? payload.win_back_eligible
        : index >= 0
          ? mutable.crmProfiles[index].win_back_eligible
          : fallback.win_back_eligible,
    reactivation_candidate:
      typeof payload.reactivation_candidate === "boolean"
        ? payload.reactivation_candidate
        : index >= 0
          ? mutable.crmProfiles[index].reactivation_candidate
          : fallback.reactivation_candidate,
    upsell_signal:
      safeTrim(payload.upsell_signal) || (index >= 0 ? mutable.crmProfiles[index].upsell_signal : fallback.upsell_signal),
    deep_clean_interest:
      safeTrim(payload.deep_clean_interest) ||
      (index >= 0 ? mutable.crmProfiles[index].deep_clean_interest : fallback.deep_clean_interest),
    notes: safeTrim(payload.notes) || (index >= 0 ? mutable.crmProfiles[index].notes : fallback.notes),
    created_at: index >= 0 ? mutable.crmProfiles[index].created_at : nowIso,
    updated_at: nowIso
  };

  if (index >= 0) {
    mutable.crmProfiles[index] = nextProfile;
  } else {
    mutable.crmProfiles.push(nextProfile);
  }

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Lifecycle profile updated."
  };
}

export function refreshLifecycleSignals(db, options = {}) {
  const mutable = cloneDatabase(db);
  const thresholdDays = Number(options.winBackThresholdDays ?? 45);
  if (!mutable.crmProfiles) {
    mutable.crmProfiles = [];
  }

  const rows = listCustomerLifecycleRows(mutable);
  const nowIso = new Date().toISOString();
  rows.forEach((row) => {
    const index = mutable.crmProfiles.findIndex((profile) => profile.client_id === row.client_id);
    const fallback = ensureProfile(mutable, row.client_id);
    const nextStage = deriveLifecycleFromUsage({
      completedVisits: row.completed_visits,
      daysSinceLastVisit: row.days_since_last_visit,
      clientStatus: row.client_status
    });
    const nextRisk = deriveChurnRisk(row.days_since_last_visit, row.outstanding_balance, row.recurring_active);
    const winBack =
      row.days_since_last_visit != null && row.days_since_last_visit >= thresholdDays && row.client_status === "active";

    const nextProfile = {
      ...(index >= 0 ? mutable.crmProfiles[index] : fallback),
      id: index >= 0 ? mutable.crmProfiles[index].id : buildNextId(mutable.crmProfiles, "crm-"),
      organization_id: index >= 0 ? mutable.crmProfiles[index].organization_id || appEnv.organizationId : appEnv.organizationId,
      client_id: row.client_id,
      lifecycle_stage: nextStage,
      churn_risk: nextRisk,
      vip_level: row.vip_level,
      win_back_eligible: winBack,
      reactivation_candidate: winBack || nextStage === LIFECYCLE_STAGE.REACTIVATION_TARGET,
      updated_at: nowIso
    };

    if (index >= 0) {
      mutable.crmProfiles[index] = nextProfile;
    } else {
      mutable.crmProfiles.push(nextProfile);
    }
  });

  return {
    db: mutable,
    ok: true,
    message: "Lifecycle signals refreshed from operational history."
  };
}

export function getLifecycleAutomationSegments(db) {
  const rows = listCustomerLifecycleRows(db);

  const winBackCandidates = rows.filter((row) => row.win_back_eligible || row.reactivation_candidate);
  const upsellCandidates = rows.filter(
    (row) => (row.upsell_signal === "high" || row.deep_clean_interest === "high") && row.lifecycle_stage === LIFECYCLE_STAGE.ACTIVE
  );
  const deepCleanRecommendations = rows.filter(
    (row) =>
      row.deep_clean_interest === "high" &&
      row.service_frequency !== "Monthly" &&
      row.lifecycle_stage !== LIFECYCLE_STAGE.CHURNED
  );
  const repeatBookingOpportunities = rows.filter(
    (row) => row.lifecycle_stage === LIFECYCLE_STAGE.LEAD || row.lifecycle_stage === LIFECYCLE_STAGE.NEW
  );

  return {
    winBackCandidates,
    upsellCandidates,
    deepCleanRecommendations,
    repeatBookingOpportunities
  };
}
