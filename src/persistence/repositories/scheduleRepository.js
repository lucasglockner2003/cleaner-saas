import { assignVisitEmployee, moveVisitOrder, reassignVisitTeam } from "../../services/schedule/scheduleService";
import { withPersistPlan } from "./repositoryResult";

export function createScheduleRepository() {
  return {
    moveVisit(db, visitId, direction) {
      return withPersistPlan(moveVisitOrder(db, visitId, direction), ["scheduledVisits"]);
    },

    assignVisitTeam(db, visitId, teamId) {
      return withPersistPlan(reassignVisitTeam(db, visitId, teamId), ["scheduledVisits", "scheduleDays"]);
    },

    assignVisitEmployee(db, visitId, employeeId) {
      return withPersistPlan(assignVisitEmployee(db, visitId, employeeId), ["scheduledVisits"]);
    }
  };
}

