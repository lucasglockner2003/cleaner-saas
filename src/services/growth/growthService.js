import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";

export const REFERRAL_STATUS = {
  INVITED: "invited",
  QUALIFIED: "qualified",
  CONVERTED: "converted",
  REWARDED: "rewarded",
  CANCELLED: "cancelled"
};

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed"
};

function normalizeCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeReferralPayload(payload = {}) {
  return {
    referrer_client_id: safeTrim(payload.referrer_client_id),
    referred_client_id: safeTrim(payload.referred_client_id) || null,
    referred_name: safeTrim(payload.referred_name),
    referred_email: safeTrim(payload.referred_email),
    source_channel: safeTrim(payload.source_channel) || "customer_referral",
    status: safeTrim(payload.status).toLowerCase() || REFERRAL_STATUS.INVITED,
    reward_type: safeTrim(payload.reward_type) || "credit",
    reward_amount: normalizeCurrency(payload.reward_amount ?? 0),
    reward_status: safeTrim(payload.reward_status) || "pending",
    campaign_id: safeTrim(payload.campaign_id) || null,
    notes: safeTrim(payload.notes)
  };
}

function normalizeCampaignPayload(payload = {}) {
  return {
    name: safeTrim(payload.name),
    type: safeTrim(payload.type) || "general",
    channel: safeTrim(payload.channel) || "email",
    status: safeTrim(payload.status).toLowerCase() || CAMPAIGN_STATUS.DRAFT,
    audience_segment: safeTrim(payload.audience_segment) || "all_clients",
    objective: safeTrim(payload.objective),
    sent_count: Number(payload.sent_count ?? 0),
    response_count: Number(payload.response_count ?? 0),
    conversion_count: Number(payload.conversion_count ?? 0),
    started_at: safeTrim(payload.started_at) || null,
    ended_at: safeTrim(payload.ended_at) || null
  };
}

function enrichReferral(db, referral) {
  const referrer = findById(db.clients ?? [], referral.referrer_client_id);
  const referredClient = referral.referred_client_id ? findById(db.clients ?? [], referral.referred_client_id) : null;
  const campaign = referral.campaign_id ? findById(db.growthCampaigns ?? [], referral.campaign_id) : null;

  return {
    ...referral,
    referrer_name: referrer?.full_name ?? "-",
    referred_client_name: referredClient?.full_name ?? null,
    campaign_name: campaign?.name ?? null
  };
}

export function listReferrals(db, filters = {}) {
  const { status = "all", campaignId = "all" } = filters;
  return (db.referrals ?? [])
    .filter((row) => (status === "all" ? true : row.status === status))
    .filter((row) => (campaignId === "all" ? true : row.campaign_id === campaignId))
    .map((row) => enrichReferral(db, row))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createReferralRecord(db, payload = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.referrals) {
    mutable.referrals = [];
  }

  const normalized = normalizeReferralPayload(payload);
  const errors = {};

  if (!normalized.referrer_client_id || !(mutable.clients ?? []).some((client) => client.id === normalized.referrer_client_id)) {
    errors.referrer_client_id = "Referrer client is required.";
  }

  if (!normalized.referred_name || normalized.referred_name.length < 2) {
    errors.referred_name = "Referred contact name is required.";
  }

  if (!normalized.referred_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.referred_email)) {
    errors.referred_email = "Valid referred email is required.";
  }

  if (!Object.values(REFERRAL_STATUS).includes(normalized.status)) {
    errors.status = "Invalid referral status.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      db,
      ok: false,
      errors,
      message: "Referral validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  mutable.referrals.push({
    id: buildNextId(mutable.referrals, "ref-"),
    organization_id: appEnv.organizationId,
    ...normalized,
    converted_at:
      normalized.status === REFERRAL_STATUS.CONVERTED || normalized.status === REFERRAL_STATUS.REWARDED
        ? nowIso
        : null,
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Referral record created."
  };
}

export function setReferralStatus(db, referralId, status, options = {}) {
  const mutable = cloneDatabase(db);
  const index = (mutable.referrals ?? []).findIndex((row) => row.id === referralId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Referral not found."
    };
  }

  if (!Object.values(REFERRAL_STATUS).includes(status)) {
    return {
      db,
      ok: false,
      message: "Invalid referral status."
    };
  }

  const row = mutable.referrals[index];
  mutable.referrals[index] = {
    ...row,
    status,
    referred_client_id: safeTrim(options.referred_client_id) || row.referred_client_id,
    reward_status: safeTrim(options.reward_status) || row.reward_status,
    notes: safeTrim(options.notes) || row.notes,
    converted_at:
      status === REFERRAL_STATUS.CONVERTED || status === REFERRAL_STATUS.REWARDED
        ? row.converted_at || new Date().toISOString()
        : row.converted_at,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: `Referral marked as ${status}.`
  };
}

export function listGrowthCampaigns(db, filters = {}) {
  const { status = "all" } = filters;
  return (db.growthCampaigns ?? [])
    .filter((campaign) => (status === "all" ? true : campaign.status === status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createGrowthCampaign(db, payload = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.growthCampaigns) {
    mutable.growthCampaigns = [];
  }

  const normalized = normalizeCampaignPayload(payload);
  const errors = {};

  if (!normalized.name || normalized.name.length < 3) {
    errors.name = "Campaign name is required.";
  }

  if (!Object.values(CAMPAIGN_STATUS).includes(normalized.status)) {
    errors.status = "Invalid campaign status.";
  }

  if (Number.isNaN(normalized.sent_count) || Number.isNaN(normalized.response_count) || Number.isNaN(normalized.conversion_count)) {
    errors.metrics = "Campaign metrics must be numeric.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      db,
      ok: false,
      errors,
      message: "Campaign validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  mutable.growthCampaigns.push({
    id: buildNextId(mutable.growthCampaigns, "camp-"),
    organization_id: appEnv.organizationId,
    ...normalized,
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Growth campaign created."
  };
}

export function setGrowthCampaignStatus(db, campaignId, status) {
  const mutable = cloneDatabase(db);
  const index = (mutable.growthCampaigns ?? []).findIndex((campaign) => campaign.id === campaignId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Campaign not found."
    };
  }

  if (!Object.values(CAMPAIGN_STATUS).includes(status)) {
    return {
      db,
      ok: false,
      message: "Invalid campaign status."
    };
  }

  const current = mutable.growthCampaigns[index];
  mutable.growthCampaigns[index] = {
    ...current,
    status,
    started_at: status === CAMPAIGN_STATUS.ACTIVE ? current.started_at || new Date().toISOString() : current.started_at,
    ended_at: status === CAMPAIGN_STATUS.COMPLETED ? new Date().toISOString() : current.ended_at,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: `Campaign marked as ${status}.`
  };
}

export function getGrowthSummary(db) {
  const referrals = listReferrals(db);
  const campaigns = listGrowthCampaigns(db);
  const bookingRequests = db.bookingRequests ?? [];
  const crmProfiles = db.crmProfiles ?? [];

  const acquisitionCounts = crmProfiles.reduce((acc, profile) => {
    const source = profile.acquisition_source || "unknown";
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  const bookingSourceCounts = bookingRequests.reduce((acc, booking) => {
    const source = booking.source || "unknown";
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === CAMPAIGN_STATUS.ACTIVE);
  const totalCampaignSent = campaigns.reduce((total, campaign) => total + (campaign.sent_count ?? 0), 0);
  const totalCampaignConversions = campaigns.reduce((total, campaign) => total + (campaign.conversion_count ?? 0), 0);
  const conversionRate =
    totalCampaignSent > 0 ? Number(((totalCampaignConversions / totalCampaignSent) * 100).toFixed(1)) : 0;

  const convertedReferrals = referrals.filter((referral) =>
    [REFERRAL_STATUS.CONVERTED, REFERRAL_STATUS.REWARDED].includes(referral.status)
  ).length;
  const referralRewardsPending = referrals.filter((referral) => referral.reward_status === "pending").length;

  return {
    referrals: {
      total: referrals.length,
      converted: convertedReferrals,
      invited: referrals.filter((referral) => referral.status === REFERRAL_STATUS.INVITED).length,
      rewardsPending: referralRewardsPending
    },
    campaigns: {
      total: campaigns.length,
      active: activeCampaigns.length,
      conversionRate,
      sent: totalCampaignSent,
      conversions: totalCampaignConversions
    },
    acquisitionBySource: Object.entries(acquisitionCounts)
      .map(([source, clients]) => ({ source, clients }))
      .sort((a, b) => b.clients - a.clients),
    bookingBySource: Object.entries(bookingSourceCounts)
      .map(([source, requests]) => ({ source, requests }))
      .sort((a, b) => b.requests - a.requests)
  };
}
