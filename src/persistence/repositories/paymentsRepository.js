import {
  applyPaymentProviderEvent,
  createPaymentRecord,
  preparePaymentIntent,
  runPaymentReconciliationCycle,
  updatePaymentStatus
} from "../../services/payments/paymentsService";
import { withPersistPlan } from "./repositoryResult";

export function createPaymentsRepository() {
  return {
    create(db, payload) {
      return withPersistPlan(createPaymentRecord(db, payload), ["payments", "invoices", "paymentEvents"]);
    },

    setStatus(db, paymentId, status, options = {}) {
      return withPersistPlan(updatePaymentStatus(db, paymentId, status, options), ["payments", "invoices", "paymentEvents"]);
    },

    async prepareIntent(db, payload) {
      return withPersistPlan(await preparePaymentIntent(db, payload), ["payments", "invoices", "paymentEvents"]);
    },

    applyProviderEvent(db, payload) {
      return withPersistPlan(applyPaymentProviderEvent(db, payload), ["payments", "invoices", "paymentEvents"]);
    },

    async reconcile(db, options = {}) {
      return withPersistPlan(await runPaymentReconciliationCycle(db, options), ["payments", "invoices", "paymentEvents"]);
    }
  };
}
