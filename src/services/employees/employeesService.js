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
  const revenue = completedVisits.reduce((total, visit) => total + (visit.price ?? 0), 0);
  const onTimeCount = completedVisits.filter((visit) => {
    const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
    return (log?.actual_duration_min ?? visit.estimated_duration_min) <= visit.estimated_duration_min;
  }).length;
  const lateStarts = completedVisits.filter((visit) => {
    const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
    if (!log?.actual_start || !visit.estimated_start) {
      return false;
    }

    const actual = new Date(log.actual_start);
    const actualMin = actual.getHours() * 60 + actual.getMinutes();
    const [estimatedHours, estimatedMinutes] = visit.estimated_start.split(":").map(Number);
    const estimatedTotal = estimatedHours * 60 + estimatedMinutes;
    return actualMin > estimatedTotal;
  }).length;

  return {
    assignedVisits: assignedVisits.length,
    housesCompleted: completedVisits.length,
    hoursWorked,
    averageDurationMin,
    productivity,
    revenue,
    onTimeRate: completedVisits.length ? Number((onTimeCount / completedVisits.length).toFixed(2)) : 0,
    lateStarts
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
  const revenue = employees.reduce((total, employee) => total + employee.metrics.revenue, 0);

  return {
    active,
    housesCompleted,
    hoursWorked: Number(hoursWorked.toFixed(1)),
    revenue
  };
}
