import { findById } from "../helpers";
import { buildDayEstimation } from "../../utils/scheduleEstimator";
import { WEEK_DAYS } from "../../constants/status";

function enrichVisit(db, visit) {
  const client = findById(db.clients, visit.client_id);
  const team = findById(db.teams, visit.team_id);
  const serviceType = findById(db.serviceTypes, visit.service_type_id);

  return {
    ...visit,
    client_name: client?.full_name ?? "Unknown client",
    client_suburb: client?.suburb ?? "-",
    team_name: team?.name ?? "-",
    service_type_name: serviceType?.name ?? "-"
  };
}

export function getWeeklySchedule(db) {
  const dayMap = WEEK_DAYS.map((dayName) => {
    const scheduleDay = db.scheduleDays.find((day) => day.day_name === dayName);

    if (!scheduleDay) {
      return {
        day_name: dayName,
        date: null,
        team_name: "-",
        visits: [],
        estimation: null
      };
    }

    const team = findById(db.teams, scheduleDay.team_id);
    const visits = db.scheduledVisits
      .filter((visit) => visit.schedule_day_id === scheduleDay.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((visit) => enrichVisit(db, visit));

    const estimation = buildDayEstimation({
      startTime: scheduleDay.start_time,
      breakDurationMin: scheduleDay.break_duration_min,
      travelBufferMin: 15,
      breakAfterVisit: 2,
      visits
    });

    return {
      ...scheduleDay,
      team_name: team?.name ?? "-",
      visits,
      estimation
    };
  });

  return dayMap;
}

export function getScheduleQuickStats(db) {
  const visits = db.scheduledVisits;
  const completed = visits.filter((visit) => visit.status === "completed").length;
  const inProgress = visits.filter((visit) => visit.status === "in_progress").length;
  const scheduled = visits.filter((visit) => visit.status === "scheduled").length;
  const cancelled = visits.filter((visit) => visit.status === "cancelled").length;

  return {
    total: visits.length,
    completed,
    inProgress,
    scheduled,
    cancelled
  };
}

