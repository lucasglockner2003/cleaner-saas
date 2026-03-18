import { cloneDatabase, findById } from "../helpers";
import { buildDayEstimation } from "../../utils/scheduleEstimator";

export function listTeamsWithWorkload(db) {
  return db.teams.map((team) => {
    const members = db.teamMembers
      .filter((member) => member.team_id === team.id)
      .map((member) => findById(db.employees, member.employee_id))
      .filter(Boolean);

    const assignedVisits = db.scheduledVisits.filter((visit) => visit.team_id === team.id);
    const completedVisits = assignedVisits.filter((visit) => visit.status === "completed").length;
    const inProgressVisits = assignedVisits.filter((visit) => visit.status === "in_progress").length;
    const scheduledVisits = assignedVisits.filter((visit) => visit.status === "scheduled").length;

    const totalEstimatedMin = assignedVisits.reduce(
      (total, visit) => total + (visit.estimated_duration_min ?? 0),
      0
    );
    const workloadHours = Number((totalEstimatedMin / 60).toFixed(1));
    const completedVisitRecords = assignedVisits.filter((visit) => visit.status === "completed");
    const totalRevenue = completedVisitRecords.reduce((total, visit) => total + (visit.price ?? 0), 0);
    const overrunCount = completedVisitRecords.filter((visit) => {
      const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
      return (log?.actual_duration_min ?? 0) > visit.estimated_duration_min;
    }).length;

    return {
      ...team,
      members,
      stats: {
        assignedVisits: assignedVisits.length,
        completedVisits,
        inProgressVisits,
        scheduledVisits,
        workloadHours,
        totalRevenue,
        overrunRate: completedVisitRecords.length
          ? Number((overrunCount / completedVisitRecords.length).toFixed(2))
          : 0
      },
      route_placeholder: "Route optimization module planned",
      performance_placeholder: "Advanced team efficiency scoring planned"
    };
  });
}

export function getTeamDayProjection(db, teamId, date) {
  const day = db.scheduleDays.find((scheduleDay) => scheduleDay.team_id === teamId && scheduleDay.date === date);
  if (!day) {
    return null;
  }

  const visits = db.scheduledVisits
    .filter((visit) => visit.schedule_day_id === day.id)
    .sort((a, b) => a.order_index - b.order_index);

  return buildDayEstimation({
    startTime: day.start_time,
    breakDurationMin: day.break_duration_min,
    travelBufferMin: 15,
    breakAfterVisit: 2,
    visits
  });
}

export function reassignEmployeeTeam(db, employeeId, teamId) {
  const mutable = cloneDatabase(db);
  const employeeIndex = mutable.employees.findIndex((employee) => employee.id === employeeId);
  if (employeeIndex < 0) {
    return db;
  }

  mutable.employees[employeeIndex] = {
    ...mutable.employees[employeeIndex],
    team_id: teamId || null
  };

  const activeMembershipIndex = mutable.teamMembers.findIndex(
    (member) => member.employee_id === employeeId && member.assigned_to == null
  );

  if (activeMembershipIndex >= 0) {
    mutable.teamMembers[activeMembershipIndex] = {
      ...mutable.teamMembers[activeMembershipIndex],
      assigned_to: new Date().toISOString().slice(0, 10)
    };
  }

  if (teamId) {
    mutable.teamMembers.push({
      id: `tm-${String(mutable.teamMembers.length + 1).padStart(3, "0")}`,
      team_id: teamId,
      employee_id: employeeId,
      assigned_from: new Date().toISOString().slice(0, 10),
      assigned_to: null
    });
  }

  return mutable;
}
