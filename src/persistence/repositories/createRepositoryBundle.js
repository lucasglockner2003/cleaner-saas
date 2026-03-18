import { createClientsRepository } from "./clientsRepository";
import { createVisitsRepository } from "./visitsRepository";
import { createScheduleRepository } from "./scheduleRepository";
import { createProductsRepository } from "./productsRepository";
import { createTeamsRepository } from "./teamsRepository";
import { createEmployeesRepository } from "./employeesRepository";
import { createRemindersRepository } from "./remindersRepository";
import { createInvoicesRepository } from "./invoicesRepository";
import { createCompletionRepository } from "./completionRepository";
import { createBookingsRepository } from "./bookingsRepository";
import { createRecurringRepository } from "./recurringRepository";

export function createRepositoryBundle() {
  return {
    clients: createClientsRepository(),
    visits: createVisitsRepository(),
    schedule: createScheduleRepository(),
    products: createProductsRepository(),
    teams: createTeamsRepository(),
    employees: createEmployeesRepository(),
    reminders: createRemindersRepository(),
    invoices: createInvoicesRepository(),
    completion: createCompletionRepository(),
    bookings: createBookingsRepository(),
    recurring: createRecurringRepository()
  };
}
