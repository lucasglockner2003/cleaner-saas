/**
 * Lightweight runtime model descriptions.
 * These shapes mirror documented entities in docs/data-model.md.
 */

export const modelCatalog = {
  clients: "Customer profile and operational preferences.",
  clientNotes: "Operational instructions and edge-case notes for cleaners.",
  serviceTypes: "Service catalog with default duration and price.",
  recurringServices: "Recurring scheduling preferences by weekday/time windows.",
  teams: "Delivery units for assignments.",
  employees: "Cleaner/operator records and baseline productivity data.",
  teamMembers: "Many-to-many relation between teams and employees.",
  scheduleDays: "Day-level schedule metadata.",
  scheduledVisits: "Planned visits linked to client/team/day.",
  visitLogs: "Execution-level logs and actual timings.",
  visitPhotos: "Before/after proof metadata.",
  expenses: "Daily operational costs for margin tracking.",
  products: "Inventory records with stock thresholds.",
  productMovements: "Inventory movement ledger.",
  reminders: "Queued reminder communications.",
  invoices: "Billing lifecycle model with communication status.",
  ratings: "Future service quality feedback model.",
  communicationJobs: "Asynchronous communication workflow jobs with delivery lifecycle.",
  bookingRequests: "Customer and lead booking requests pending internal review/approval.",
  portalAccounts: "Customer portal account records linked to client profiles."
};
