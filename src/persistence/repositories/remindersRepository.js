import {
  prepareReminderQueueForDate,
  retryReminderNow,
  runReminderDispatchCycle
} from "../../services/pipeline/reminderPipelineService";
import { withPersistPlan } from "./repositoryResult";

export function createRemindersRepository() {
  return {
    prepareForDate(db, targetDate, scheduledAt = null) {
      return withPersistPlan(prepareReminderQueueForDate(db, targetDate, scheduledAt), [
        "reminders",
        "communicationJobs"
      ]);
    },

    dispatchCycle(db, options = {}) {
      return withPersistPlan(runReminderDispatchCycle(db, options), ["reminders", "communicationJobs"]);
    },

    retryNow(db, reminderId) {
      return withPersistPlan(retryReminderNow(db, reminderId), ["reminders", "communicationJobs"]);
    }
  };
}

