import { reassignEmployeeTeam } from "../../services/teams/teamsService";
import { withPersistPlan } from "./repositoryResult";

export function createTeamsRepository() {
  return {
    reassignEmployee(db, employeeId, teamId) {
      return withPersistPlan(reassignEmployeeTeam(db, employeeId, teamId), ["employees", "teamMembers"]);
    }
  };
}

