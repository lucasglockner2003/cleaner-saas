import { withPersistPlan } from "./repositoryResult";

export function createEmployeesRepository() {
  return {
    updateEmployeeRecord(db, employeeId, payload) {
      const nextDb = JSON.parse(JSON.stringify(db));
      const index = nextDb.employees.findIndex((employee) => employee.id === employeeId);

      if (index < 0) {
        return withPersistPlan(
          {
            db,
            ok: false,
            message: "Employee record not found."
          },
          []
        );
      }

      nextDb.employees[index] = {
        ...nextDb.employees[index],
        ...payload
      };

      return withPersistPlan(nextDb, ["employees"]);
    }
  };
}

