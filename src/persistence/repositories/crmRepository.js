import { refreshLifecycleSignals, updateClientLifecycleProfile } from "../../services/crm/crmService";
import { withPersistPlan } from "./repositoryResult";

export function createCrmRepository() {
  return {
    updateProfile(db, clientId, payload) {
      return withPersistPlan(updateClientLifecycleProfile(db, clientId, payload), ["crmProfiles"]);
    },

    refreshSignals(db, options = {}) {
      return withPersistPlan(refreshLifecycleSignals(db, options), ["crmProfiles"]);
    }
  };
}

