import {
  addVisitPhotoPlaceholder,
  cancelVisitExecution,
  finishVisitExecution,
  reopenVisitToScheduled,
  startVisitExecution,
  updateVisitExecutionNotes
} from "../../services/visits/visitsService";
import { queueServiceCompletionEmail } from "../../services/pipeline/completionPipelineService";
import { withPersistPlan } from "./repositoryResult";

export function createVisitsRepository() {
  return {
    start(db, visitId) {
      return withPersistPlan(startVisitExecution(db, visitId), ["scheduledVisits", "visitLogs"]);
    },

    finish(db, visitId, notes = "") {
      const finishedResult = finishVisitExecution(db, visitId, notes);
      if (!finishedResult.ok) {
        return withPersistPlan(finishedResult, ["scheduledVisits", "visitLogs", "clients"]);
      }

      const queuedCompletion = queueServiceCompletionEmail(finishedResult.db, visitId);
      return withPersistPlan(
        {
          ...queuedCompletion,
          message:
            queuedCompletion.ok
              ? "House visit marked as completed and completion email queued."
              : "House visit marked as completed. Completion email queue pending."
        },
        ["scheduledVisits", "visitLogs", "clients", "communicationJobs"]
      );
    },

    cancel(db, visitId, reason) {
      return withPersistPlan(cancelVisitExecution(db, visitId, reason), ["scheduledVisits", "visitLogs"]);
    },

    reopen(db, visitId) {
      return withPersistPlan(reopenVisitToScheduled(db, visitId), ["scheduledVisits", "visitLogs"]);
    },

    updateNotes(db, visitId, notes) {
      return withPersistPlan(updateVisitExecutionNotes(db, visitId, notes), ["visitLogs"]);
    },

    addPhoto(db, visitId, phase, fileName) {
      return withPersistPlan(addVisitPhotoPlaceholder(db, visitId, phase, fileName), ["visitPhotos", "visitLogs"]);
    }
  };
}
