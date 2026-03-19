export const DB_COLLECTION_TO_TABLE = {
  clients: "clients",
  clientNotes: "client_notes",
  serviceTypes: "service_types",
  recurringServices: "recurring_services",
  teams: "teams",
  employees: "employees",
  teamMembers: "team_members",
  scheduleDays: "schedule_days",
  scheduledVisits: "scheduled_visits",
  visitLogs: "visit_logs",
  visitPhotos: "visit_photos",
  expenses: "expenses",
  products: "products",
  productMovements: "product_movements",
  reminders: "reminders",
  invoices: "invoices",
  payments: "payments",
  paymentEvents: "payment_events",
  subscriptionPlans: "subscription_plans",
  clientSubscriptions: "client_subscriptions",
  ratings: "ratings",
  communicationJobs: "communication_jobs",
  bookingRequests: "booking_requests",
  portalAccounts: "portal_accounts",
  crmProfiles: "crm_profiles",
  referrals: "referrals",
  growthCampaigns: "growth_campaigns",
  operationJobs: "operation_jobs",
  auditEvents: "audit_events"
};

export const TABLE_TO_DB_COLLECTION = Object.entries(DB_COLLECTION_TO_TABLE).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});
