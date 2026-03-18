import {
  createRecurringPreference,
  materializeRecurringOccurrence,
  setRecurringStatus,
  updateRecurringPreference
} from "../../services/recurring/recurringScheduleService";
import { withPersistPlan } from "./repositoryResult";

export function createRecurringRepository() {
  return {
    create(db, payload) {
      return withPersistPlan(createRecurringPreference(db, payload), ["recurringServices"]);
    },

    update(db, recurringId, payload) {
      return withPersistPlan(updateRecurringPreference(db, recurringId, payload), ["recurringServices"]);
    },

    setStatus(db, recurringId, status) {
      return withPersistPlan(setRecurringStatus(db, recurringId, status), ["recurringServices"]);
    },

    materialize(db, recurringId, occurrenceDate, options = {}) {
      return withPersistPlan(materializeRecurringOccurrence(db, recurringId, occurrenceDate, options), [
        "recurringServices",
        "scheduledVisits",
        "scheduleDays"
      ]);
    }
  };
}
