import {
  generateFakeVisitExecutions,
  generatePilotWeekSchedule,
  generateTestInvoices,
  getClientCsvPilotSample,
  getClientCsvTemplate,
  importClientsFromCsv,
  simulateTestPayments
} from "../../services/pilot/pilotDataToolingService";
import { withPersistPlan } from "./repositoryResult";

export function createPilotRepository() {
  return {
    getClientCsvTemplate() {
      return getClientCsvTemplate();
    },

    getClientCsvSample() {
      return getClientCsvPilotSample();
    },

    importClientsCsv(db, csvText) {
      return withPersistPlan(importClientsFromCsv(db, csvText), ["clients", "crmProfiles"]);
    },

    generateWeekSchedule(db, options = {}) {
      return withPersistPlan(generatePilotWeekSchedule(db, options), [
        "scheduleDays",
        "scheduledVisits",
        "visitLogs",
        "visitPhotos",
        "communicationJobs",
        "reminders"
      ]);
    },

    generateFakeVisits(db, options = {}) {
      return withPersistPlan(generateFakeVisitExecutions(db, options), [
        "scheduledVisits",
        "visitLogs",
        "visitPhotos",
        "communicationJobs",
        "clients"
      ]);
    },

    generateInvoices(db, options = {}) {
      return withPersistPlan(generateTestInvoices(db, options), ["invoices", "communicationJobs"]);
    },

    simulatePayments(db, options = {}) {
      return withPersistPlan(simulateTestPayments(db, options), ["payments", "invoices", "paymentEvents"]);
    }
  };
}
