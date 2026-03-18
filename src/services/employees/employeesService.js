import { findById } from "../helpers";

function calculateEmployeeMetrics(db, employee) {
  const assignedVisits = db.scheduledVisits.filter((visit) => visit.employee_id === employee.id);
  const completedVisits = assignedVisits.filter((visit) => visit.status === "completed");

  const logs = completedVisits
    .map((visit) => db.visitLogs.find((log) => log.scheduled_visit_id === visit.id))
    .filter(Boolean);

  const totalMinutes = logs.reduce((total, log) => total + (log.actual_duration_min ?? 0), 0);
  const hoursWorked = Number((totalMinutes / 60).toFixed(1));
  const averageDurationMin = logs.length ? Math.round(totalMinutes / logs.length) : null;
  const productivity = hoursWorked > 0 ? Number((completedVisits.length / hoursWorked).toFixed(2)) : 0;

  return {
    assignedVisits: assignedVisits.length,
    housesCompleted: completedVisits.length,
    hoursWorked,
    averageDurationMin,
    productivity
  };
}

export function listEmployeesWithMetrics(db) {
  return db.employees.map((employee) => {
    const team = employee.team_id ? findById(db.teams, employee.team_id) : null;
    return {
      ...employee,
      team_name: team?.name ?? "Unassigned",
      metrics: calculateEmployeeMetrics(db, employee)
    };
  });
}

export function getEmployeesQuickStats(db) {
  const employees = listEmployeesWithMetrics(db);
  const active = employees.filter((employee) => employee.status === "active").length;
  const housesCompleted = employees.reduce((total, employee) => total + employee.metrics.housesCompleted, 0);
  const hoursWorked = employees.reduce((total, employee) => total + employee.metrics.hoursWorked, 0);

  return {
    active,
    housesCompleted,
    hoursWorked: Number(hoursWorked.toFixed(1))
  };
}

