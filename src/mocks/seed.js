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
import { ratings } from "./entities/ratings";
import { communicationJobs } from "./entities/communicationJobs";
import { bookingRequests } from "./entities/bookingRequests";
import { portalAccounts } from "./entities/portalAccounts";

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
  ratings,
  communicationJobs,
  bookingRequests,
  portalAccounts
};

export function createSeedDatabase() {
  return JSON.parse(JSON.stringify(seedDatabase));
}
