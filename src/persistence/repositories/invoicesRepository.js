import {
  changeInvoiceStatus,
  queueInvoiceEmailDispatch,
  retryInvoiceCommunicationJob,
  runInvoiceDispatchCycle,
  runInvoiceDraftGenerationCycle
} from "../../services/pipeline/invoicePipelineService";
import { withPersistPlan } from "./repositoryResult";

export function createInvoicesRepository() {
  return {
    generateDrafts(db, periodStart, periodEnd) {
      return withPersistPlan(runInvoiceDraftGenerationCycle(db, periodStart, periodEnd), ["invoices"]);
    },

    setStatus(db, invoiceId, nextStatus) {
      return withPersistPlan(changeInvoiceStatus(db, invoiceId, nextStatus), ["invoices"]);
    },

    queueEmail(db, invoiceId) {
      return withPersistPlan(queueInvoiceEmailDispatch(db, invoiceId), ["invoices", "communicationJobs"]);
    },

    dispatchEmailCycle(db, options = {}) {
      return withPersistPlan(runInvoiceDispatchCycle(db, options), ["invoices", "communicationJobs"]);
    },

    retryEmailJob(db, jobId) {
      return withPersistPlan(retryInvoiceCommunicationJob(db, jobId), ["invoices", "communicationJobs"]);
    }
  };
}
