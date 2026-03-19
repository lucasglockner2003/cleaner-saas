import {
  createGrowthCampaign,
  createReferralRecord,
  setGrowthCampaignStatus,
  setReferralStatus
} from "../../services/growth/growthService";
import { withPersistPlan } from "./repositoryResult";

export function createGrowthRepository() {
  return {
    createReferral(db, payload) {
      return withPersistPlan(createReferralRecord(db, payload), ["referrals"]);
    },

    setReferralStatus(db, referralId, status, options = {}) {
      return withPersistPlan(setReferralStatus(db, referralId, status, options), ["referrals"]);
    },

    createCampaign(db, payload) {
      return withPersistPlan(createGrowthCampaign(db, payload), ["growthCampaigns"]);
    },

    setCampaignStatus(db, campaignId, status) {
      return withPersistPlan(setGrowthCampaignStatus(db, campaignId, status), ["growthCampaigns"]);
    }
  };
}

