import { buildNextId, cloneDatabase, findById } from "../helpers";
import { buildDayEstimation, durationDelta } from "../../utils/scheduleEstimator";
import { WEEK_DAYS } from "../../constants/status";
import { parseTimeToMinutes } from "../../utils/dateTime";

function enrichVisit(db, visit) {
  const client = findById(db.clients, visit.client_id);
  const team = findById(db.teams, visit.team_id);
  const serviceType = findById(db.serviceTypes, visit.service_type_id);
  const employee = findById(db.employees, visit.employee_id);
  const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
  const actualStart = log?.actual_start ? new Date(log.actual_start) : null;
  const actualStartMin = actualStart ? actualStart.getHours() * 60 + actualStart.getMinutes() : null;
  const estimatedMin = parseTimeToMinutes(visit.estimated_start);
  const latenessMin = actualStartMin == null ? null : Math.max(0, actualStartMin - estimatedMin);
  const actualDurationMin = log?.actual_duration_min ?? null;

  return {
    ...visit,
    client_name: client?.full_name ?? "Unknown client",
    client_suburb: client?.suburb ?? "-",
    team_name: team?.name ?? "-",
    employee_name: employee?.full_name ?? "Unassigned",
    service_type_name: serviceType?.name ?? "-",
    actual_duration_min: actualDurationMin,
    delta_min: durationDelta(visit.estimated_duration_min, actualDurationMin),
    lateness_min: latenessMin
  };
}

function summarizeDay(visits) {
  const completed = visits.filter((visit) => visit.status === "completed");
  const scheduled = visits.filter((visit) => visit.status === "scheduled");
  const inProgress = visits.filter((visit) => visit.status === "in_progress");
  const totalEstimatedMin = visits.reduce((total, visit) => total + (visit.estimated_duration_min ?? 0), 0);
  const totalActualMin = completed.reduce((total, visit) => total + (visit.actual_duration_min ?? 0), 0);
  const overrunCount = completed.filter((visit) => (visit.delta_min ?? 0) > 0).length;
  const lateStarts = visits.filter((visit) => (visit.lateness_min ?? 0) > 0).length;

  return {
    total: visits.length,
    completed: completed.length,
    inProgress: inProgress.length,
    scheduled: scheduled.length,
    totalEstimatedMin,
    totalActualMin,
    overrunCount,
    lateStarts
  };
}

export function getWeeklySchedule(db) {
  const rows = [];

  WEEK_DAYS.forEach((dayName) => {
    const scheduleDays = db.scheduleDays.filter((day) => day.day_name === dayName);

    if (!scheduleDays.length) {
      rows.push({
        day_name: dayName,
        date: null,
        team_id: null,
        team_name: "-",
        visits: [],
        estimation: null,
        daySummary: summarizeDay([])
      });
      return;
    }

    scheduleDays
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((scheduleDay) => {
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

        rows.push({
          ...scheduleDay,
          team_name: team?.name ?? "-",
          visits,
          estimation,
          daySummary: summarizeDay(visits)
        });
      });
  });

  return rows;
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

function findOrCreateScheduleDay(db, teamId, date, fallbackFrom) {
  const existing = db.scheduleDays.find((day) => day.team_id === teamId && day.date === date);
  if (existing) {
    return existing;
  }

  const base = fallbackFrom ?? {
    day_name: new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00.000Z`)
    ),
    start_time: "08:00",
    break_duration_min: 30
  };

  const created = {
    id: buildNextId(db.scheduleDays, "sd-"),
    date,
    day_name: base.day_name,
    team_id: teamId,
    start_time: base.start_time,
    break_duration_min: base.break_duration_min
  };

  db.scheduleDays.push(created);
  return created;
}

export function moveVisitOrder(db, visitId, direction) {
  const mutable = cloneDatabase(db);
  const target = mutable.scheduledVisits.find((visit) => visit.id === visitId);

  if (!target) {
    return db;
  }

  const dayVisits = mutable.scheduledVisits
    .filter((visit) => visit.schedule_day_id === target.schedule_day_id)
    .sort((a, b) => a.order_index - b.order_index);
  const index = dayVisits.findIndex((visit) => visit.id === visitId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || swapIndex < 0 || swapIndex >= dayVisits.length) {
    return db;
  }

  const currentOrder = dayVisits[index].order_index;
  dayVisits[index].order_index = dayVisits[swapIndex].order_index;
  dayVisits[swapIndex].order_index = currentOrder;

  return mutable;
}

export function reassignVisitTeam(db, visitId, teamId) {
  const mutable = cloneDatabase(db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return db;
  }

  const visit = mutable.scheduledVisits[visitIndex];
  const fromDay = mutable.scheduleDays.find((day) => day.id === visit.schedule_day_id);
  const toDay = findOrCreateScheduleDay(mutable, teamId, visit.date, fromDay);

  const currentTeamVisits = mutable.scheduledVisits.filter((item) => item.schedule_day_id === toDay.id);
  const nextOrder =
    currentTeamVisits.length > 0 ? Math.max(...currentTeamVisits.map((item) => item.order_index)) + 1 : 1;

  mutable.scheduledVisits[visitIndex] = {
    ...mutable.scheduledVisits[visitIndex],
    team_id: teamId,
    schedule_day_id: toDay.id,
    order_index: nextOrder
  };

  return mutable;
}

export function assignVisitEmployee(db, visitId, employeeId) {
  const mutable = cloneDatabase(db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return db;
  }

  mutable.scheduledVisits[visitIndex] = {
    ...mutable.scheduledVisits[visitIndex],
    employee_id: employeeId || null
  };

  return mutable;
}
