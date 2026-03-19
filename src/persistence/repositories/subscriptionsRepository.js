import {
  assignClientSubscription,
  createSubscriptionPlan,
  setClientSubscriptionStatus
} from "../../services/subscriptions/subscriptionsService";
import { withPersistPlan } from "./repositoryResult";

export function createSubscriptionsRepository() {
  return {
    createPlan(db, payload) {
      return withPersistPlan(createSubscriptionPlan(db, payload), ["subscriptionPlans"]);
    },

    assignClient(db, payload) {
      return withPersistPlan(assignClientSubscription(db, payload), ["clientSubscriptions"]);
    },

    setClientStatus(db, subscriptionId, status) {
      return withPersistPlan(setClientSubscriptionStatus(db, subscriptionId, status), ["clientSubscriptions"]);
    }
  };
}

