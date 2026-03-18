import {
  queueServiceCompletionEmail,
  retryCompletionCommunicationJob,
  runServiceCompletionDispatchCycle
} from "../../services/pipeline/completionPipelineService";
import { withPersistPlan } from "./repositoryResult";

export function createCompletionRepository() {
  return {
    queueForVisit(db, visitId, options = {}) {
      return withPersistPlan(queueServiceCompletionEmail(db, visitId, options), ["communicationJobs"]);
    },

    dispatchCycle(db, options = {}) {
      return withPersistPlan(runServiceCompletionDispatchCycle(db, options), ["communicationJobs"]);
    },

    retryJob(db, jobId) {
      return withPersistPlan(retryCompletionCommunicationJob(db, jobId), ["communicationJobs"]);
    }
  };
}

