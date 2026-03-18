import { findById } from "../helpers";
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

    return {
      ...team,
      members,
      stats: {
        assignedVisits: assignedVisits.length,
        completedVisits,
        inProgressVisits,
        scheduledVisits,
        workloadHours
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

