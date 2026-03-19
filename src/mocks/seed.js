import { clients } from "./entities/clients";
import { clientNotes } from "./entities/clientNotes";
import { serviceTypes } from "./entities/serviceTypes";
import { recurringServices } from "./entities/recurringServices";
import { teams } from "./entities/teams";
import { employees } from "./entities/employees";
import { teamMembers } from "./entities/teamMembers";
import { scheduleDays } from "./entities/scheduleDays";
import { scheduledVisits } from "./entities/scheduledVisits";
import { visitLogs } from "./entities/visitLogs";
import { visitPhotos } from "./entities/visitPhotos";
import { expenses } from "./entities/expenses";
import { products } from "./entities/products";
import { productMovements } from "./entities/productMovements";
import { reminders } from "./entities/reminders";
import { invoices } from "./entities/invoices";
import { payments } from "./entities/payments";
import { paymentEvents } from "./entities/paymentEvents";
import { subscriptionPlans } from "./entities/subscriptionPlans";
import { clientSubscriptions } from "./entities/clientSubscriptions";
import { ratings } from "./entities/ratings";
import { communicationJobs } from "./entities/communicationJobs";
import { bookingRequests } from "./entities/bookingRequests";
import { portalAccounts } from "./entities/portalAccounts";
import { crmProfiles } from "./entities/crmProfiles";
import { referrals } from "./entities/referrals";
import { growthCampaigns } from "./entities/growthCampaigns";
import { operationJobs } from "./entities/operationJobs";
import { auditEvents } from "./entities/auditEvents";

const seedDatabase = {
  clients,
  clientNotes,
  serviceTypes,
  recurringServices,
  teams,
  employees,
  teamMembers,
  scheduleDays,
  scheduledVisits,
  visitLogs,
  visitPhotos,
  expenses,
  products,
  productMovements,
  reminders,
  invoices,
  payments,
  paymentEvents,
  subscriptionPlans,
  clientSubscriptions,
  ratings,
  communicationJobs,
  bookingRequests,
  portalAccounts,
  crmProfiles,
  referrals,
  growthCampaigns,
  operationJobs,
  auditEvents
};

export function createSeedDatabase() {
  return JSON.parse(JSON.stringify(seedDatabase));
}
