import {
  createOperationJob,
  retryOperationJobNow,
  runOperationJobExecutorCycle
} from "../../services/jobs/operationsJobService";
import { withPersistPlan } from "./repositoryResult";

export function createOperationsRepository() {
  return {
    queue(db, payload) {
      return withPersistPlan(createOperationJob(db, payload), ["operationJobs"]);
    },

    async runCycle(db, options = {}) {
      return withPersistPlan(await runOperationJobExecutorCycle(db, options), [
        "operationJobs",
        "reminders",
        "communicationJobs",
        "invoices",
        "payments",
        "paymentEvents",
        "crmProfiles"
      ]);
    },

    retry(db, jobId) {
      return withPersistPlan(retryOperationJobNow(db, jobId), ["operationJobs"]);
    }
  };
}
