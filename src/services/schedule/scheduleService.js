import { buildNextId, cloneDatabase, findById } from "../helpers";
import { buildDayEstimation, durationDelta } from "../../utils/scheduleEstimator";
import { WEEK_DAYS } from "../../constants/status";
import { parseTimeToMinutes } from "../../utils/dateTime";
import { buildRoutePlan, getRouteEfficiencySignal } from "../routes/routeOptimizationService";

const DEFAULT_TRAVEL_BUFFER_MIN = 15;
const DEFAULT_BREAK_AFTER_VISIT = 2;
const DEFAULT_DAY_CAPACITY_MIN = 8 * 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNumber(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

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
    client_latitude: client?.latitude ?? null,
    client_longitude: client?.longitude ?? null,
    client_geo_status: client?.geocode_status ?? "missing",
    team_name: team?.name ?? "-",
    employee_name: employee?.full_name ?? "Unassigned",
    service_type_name: serviceType?.name ?? "-",
    actual_duration_min: actualDurationMin,
    delta_min: durationDelta(visit.estimated_duration_min, actualDurationMin),
    lateness_min: latenessMin
  };
}

function summarizeDay({
  visits,
  estimation,
  routePlan,
  scheduleDay,
  recurringClientIds
}) {
  const completed = visits.filter((visit) => visit.status === "completed");
  const scheduled = visits.filter((visit) => visit.status === "scheduled");
  const inProgress = visits.filter((visit) => visit.status === "in_progress");
  const totalEstimatedMin = visits.reduce((total, visit) => total + (visit.estimated_duration_min ?? 0), 0);
  const totalActualMin = completed.reduce((total, visit) => total + (visit.actual_duration_min ?? 0), 0);
  const overrunCount = completed.filter((visit) => (visit.delta_min ?? 0) > 0).length;
  const lateStarts = visits.filter((visit) => (visit.lateness_min ?? 0) > 0).length;
  const recurringInfluenceCount = visits.filter((visit) => recurringClientIds.has(visit.client_id)).length;
  const dayCapacityMin = (scheduleDay?.target_day_minutes ?? DEFAULT_DAY_CAPACITY_MIN) + (scheduleDay?.break_duration_min ?? 0);
  const projectedWorkMin = estimation?.totalWorkedMin ?? 0;
  const overbookMin = Math.max(0, projectedWorkMin - dayCapacityMin);
  const latenessRate = visits.length ? lateStarts / visits.length : 0;
  const lowConfidenceLegs = routePlan?.recommended?.lowConfidenceLegs ?? 0;
  const longestLegKm = routePlan?.recommended?.longestLegKm ?? 0;
  const latenessRiskScore = clamp(
    Math.round(latenessRate * 55 + Math.min(30, overbookMin * 0.55) + lowConfidenceLegs * 6 + (longestLegKm > 9 ? 10 : 0)),
    0,
    100
  );
  const overbookRisk = overbookMin >= 45 ? "high" : overbookMin >= 20 ? "medium" : "low";
  const latenessRiskLevel = latenessRiskScore >= 70 ? "high" : latenessRiskScore >= 40 ? "medium" : "low";
  const recurringInfluenceRate = visits.length ? Number((recurringInfluenceCount / visits.length).toFixed(2)) : 0;

  return {
    total: visits.length,
    completed: completed.length,
    inProgress: inProgress.length,
    scheduled: scheduled.length,
    totalEstimatedMin,
    totalActualMin,
    overrunCount,
    lateStarts,
    recurringInfluenceCount,
    recurringInfluenceRate,
    routeDistanceKm: routePlan?.recommended?.estimatedDistanceKm ?? 0,
    routeTravelMin: routePlan?.recommended?.estimatedTravelMin ?? 0,
    routeTravelMinSaved: Math.max(0, routePlan?.delta?.travelMinSaved ?? 0),
    routeDistanceKmSaved: Math.max(0, routePlan?.delta?.distanceKmSaved ?? 0),
    routeEfficiencyGainPct: Math.max(0, routePlan?.delta?.efficiencyGainPct ?? 0),
    geocodeCoveragePct: routePlan?.recommended?.coordinateCoverage?.coveragePct ?? 0,
    overbookMin,
    overbookRisk,
    latenessRiskScore,
    latenessRiskLevel
  };
}

function attachLoadBalanceSignals(rows) {
  const groupedByDate = rows.reduce((acc, row) => {
    if (!row.date) {
      return acc;
    }

    const bucket = acc[row.date] ?? [];
    bucket.push(row);
    acc[row.date] = bucket;
    return acc;
  }, {});

  return rows.map((row) => {
    if (!row.date) {
      return {
        ...row,
        loadSignal: null
      };
    }

    const sameDateRows = groupedByDate[row.date] ?? [];
    const utilization = row.estimation?.totalWorkedMin
      ? row.estimation.totalWorkedMin / Math.max(1, (row.target_day_minutes ?? DEFAULT_DAY_CAPACITY_MIN) + row.break_duration_min)
      : 0;
    const averageUtilization =
      sameDateRows.length > 0
        ? sameDateRows.reduce((total, candidate) => {
            const candidateUtilization = candidate.estimation?.totalWorkedMin
              ? candidate.estimation.totalWorkedMin /
                Math.max(1, (candidate.target_day_minutes ?? DEFAULT_DAY_CAPACITY_MIN) + candidate.break_duration_min)
              : 0;
            return total + candidateUtilization;
          }, 0) / sameDateRows.length
        : utilization;
    const delta = utilization - averageUtilization;

    let signal = "balanced";
    if (utilization >= 0.96 || delta >= 0.18) {
      signal = "overloaded";
    } else if ((row.daySummary?.total ?? 0) === 0 || utilization <= 0.56 || delta <= -0.18) {
      signal = "underutilized";
    }

    return {
      ...row,
      loadSignal: {
        signal,
        utilizationRate: Number(utilization.toFixed(2)),
        averageUtilizationRate: Number(averageUtilization.toFixed(2)),
        deltaFromAveragePct: Math.round(delta * 100)
      }
    };
  });
}

function getRouteTravelBuffer(scheduleDay, routePlan) {
  return (
    routePlan?.recommended?.suggestedTravelBufferMin ??
    scheduleDay?.travel_buffer_min ??
    DEFAULT_TRAVEL_BUFFER_MIN
  );
}

function applyEstimationWindowsToVisits(mutableDb, scheduleDayId, options = {}) {
  const scheduleDay = mutableDb.scheduleDays.find((day) => day.id === scheduleDayId);
  if (!scheduleDay) {
    return;
  }

  const dayVisits = mutableDb.scheduledVisits
    .filter((visit) => visit.schedule_day_id === scheduleDayId)
    .sort((a, b) => a.order_index - b.order_index);

  if (!dayVisits.length) {
    return;
  }

  const travelBufferMin = options.travelBufferMin ?? scheduleDay.travel_buffer_min ?? DEFAULT_TRAVEL_BUFFER_MIN;
  const estimation = buildDayEstimation({
    startTime: scheduleDay.start_time,
    breakDurationMin: scheduleDay.break_duration_min,
    travelBufferMin,
    breakAfterVisit: DEFAULT_BREAK_AFTER_VISIT,
    visits: dayVisits
  });
  const visitWindows = estimation.windows.filter((window) => window.type === "visit");

  dayVisits.forEach((visit, index) => {
    const window = visitWindows.find((item) => item.visitId === visit.id);
    const visitIndex = mutableDb.scheduledVisits.findIndex((item) => item.id === visit.id);
    if (visitIndex < 0) {
      return;
    }

    mutableDb.scheduledVisits[visitIndex] = {
      ...mutableDb.scheduledVisits[visitIndex],
      order_index: index + 1,
      estimated_start: window?.start ?? mutableDb.scheduledVisits[visitIndex].estimated_start,
      estimated_end: window?.end ?? mutableDb.scheduledVisits[visitIndex].estimated_end
    };
  });
}

export function getWeeklySchedule(db) {
  const rows = [];
  const recurringClientIds = new Set(
    (db.recurringServices ?? []).filter((item) => item.status === "active").map((item) => item.client_id)
  );

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
        routePlan: null,
        daySummary: summarizeDay({
          visits: [],
          estimation: null,
          routePlan: null,
          scheduleDay: null,
          recurringClientIds
        }),
        intelligence: null,
        loadSignal: null
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

        const routePlan = buildRoutePlan({
          db,
          scheduleDay,
          visits
        });

        const estimation = buildDayEstimation({
          startTime: scheduleDay.start_time,
          breakDurationMin: scheduleDay.break_duration_min,
          travelBufferMin: getRouteTravelBuffer(scheduleDay, routePlan),
          breakAfterVisit: DEFAULT_BREAK_AFTER_VISIT,
          visits
        });

        const daySummary = summarizeDay({
          visits,
          estimation,
          routePlan,
          scheduleDay,
          recurringClientIds
        });

        rows.push({
          ...scheduleDay,
          team_name: team?.name ?? "-",
          visits,
          estimation,
          routePlan,
          daySummary,
          intelligence: {
            routeEfficiency: getRouteEfficiencySignal(routePlan),
            overbookRisk: daySummary.overbookRisk,
            latenessRisk: daySummary.latenessRiskLevel,
            recurringInfluenceCount: daySummary.recurringInfluenceCount
          },
          loadSignal: null
        });
      });
  });

  return attachLoadBalanceSignals(rows);
}

export function getScheduleQuickStats(db) {
  const visits = db.scheduledVisits;
  const completed = visits.filter((visit) => visit.status === "completed").length;
  const inProgress = visits.filter((visit) => visit.status === "in_progress").length;
  const scheduled = visits.filter((visit) => visit.status === "scheduled").length;
  const cancelled = visits.filter((visit) => visit.status === "cancelled").length;
  const week = getWeeklySchedule(db).filter((day) => day.date);
  const overloadedDays = week.filter(
    (day) => day.daySummary.overbookRisk === "high" || day.loadSignal?.signal === "overloaded"
  ).length;
  const underutilizedDays = week.filter((day) => day.loadSignal?.signal === "underutilized").length;
  const routeSavingsMin = week.reduce((total, day) => total + (day.daySummary.routeTravelMinSaved ?? 0), 0);

  return {
    total: visits.length,
    completed,
    inProgress,
    scheduled,
    cancelled,
    overloadedDays,
    underutilizedDays,
    routeSavingsMin
  };
}

export function getWeeklyOptimizationSignals(db) {
  const week = getWeeklySchedule(db).filter((day) => day.date);
  if (!week.length) {
    return {
      routeTravelMin: 0,
      routeDistanceKm: 0,
      potentialTravelMinSaved: 0,
      potentialDistanceKmSaved: 0,
      overloadedTeams: 0,
      underutilizedTeams: 0,
      averageGeocodeCoveragePct: 0,
      topOpportunity: null,
      suburbHotspots: []
    };
  }

  const routeTravelMin = week.reduce((total, day) => total + (day.daySummary.routeTravelMin ?? 0), 0);
  const routeDistanceKm = normalizeNumber(
    week.reduce((total, day) => total + (day.daySummary.routeDistanceKm ?? 0), 0)
  );
  const potentialTravelMinSaved = week.reduce((total, day) => total + (day.daySummary.routeTravelMinSaved ?? 0), 0);
  const potentialDistanceKmSaved = normalizeNumber(
    week.reduce((total, day) => total + (day.daySummary.routeDistanceKmSaved ?? 0), 0)
  );
  const overloadedTeams = week.filter((day) => day.loadSignal?.signal === "overloaded").length;
  const underutilizedTeams = week.filter((day) => day.loadSignal?.signal === "underutilized").length;
  const averageGeocodeCoveragePct =
    week.reduce((total, day) => total + (day.daySummary.geocodeCoveragePct ?? 0), 0) / week.length;

  const topOpportunity =
    [...week]
      .sort((a, b) => (b.daySummary.routeTravelMinSaved ?? 0) - (a.daySummary.routeTravelMinSaved ?? 0))
      .map((day) => ({
        day_name: day.day_name,
        date: day.date,
        team_name: day.team_name,
        travel_min_saved: day.daySummary.routeTravelMinSaved ?? 0,
        distance_km_saved: day.daySummary.routeDistanceKmSaved ?? 0
      }))[0] ?? null;

  const suburbCounter = {};
  week.forEach((day) => {
    (day.routePlan?.geography?.suburbs ?? []).forEach((item) => {
      suburbCounter[item.suburb] = (suburbCounter[item.suburb] ?? 0) + item.visits;
    });
  });

  const suburbHotspots = Object.entries(suburbCounter)
    .map(([suburb, visits]) => ({
      suburb,
      visits
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);

  return {
    routeTravelMin,
    routeDistanceKm,
    potentialTravelMinSaved,
    potentialDistanceKmSaved,
    overloadedTeams,
    underutilizedTeams,
    averageGeocodeCoveragePct: Number(averageGeocodeCoveragePct.toFixed(2)),
    topOpportunity,
    suburbHotspots
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
    break_duration_min: 30,
    travel_buffer_min: DEFAULT_TRAVEL_BUFFER_MIN,
    target_day_minutes: DEFAULT_DAY_CAPACITY_MIN
  };

  const created = {
    id: buildNextId(db.scheduleDays, "sd-"),
    date,
    day_name: base.day_name,
    team_id: teamId,
    start_time: base.start_time,
    break_duration_min: base.break_duration_min,
    travel_buffer_min: base.travel_buffer_min ?? DEFAULT_TRAVEL_BUFFER_MIN,
    target_day_minutes: base.target_day_minutes ?? DEFAULT_DAY_CAPACITY_MIN
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
  applyEstimationWindowsToVisits(mutable, target.schedule_day_id);

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
  applyEstimationWindowsToVisits(mutable, visit.schedule_day_id);
  applyEstimationWindowsToVisits(mutable, toDay.id);

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

export function applySuggestedRouteOrder(db, scheduleDayId) {
  const mutable = cloneDatabase(db);
  const scheduleDay = mutable.scheduleDays.find((day) => day.id === scheduleDayId);
  if (!scheduleDay) {
    return db;
  }

  const dayVisits = mutable.scheduledVisits
    .filter((visit) => visit.schedule_day_id === scheduleDayId)
    .sort((a, b) => a.order_index - b.order_index);

  if (dayVisits.length <= 1) {
    return db;
  }

  const routePlan = buildRoutePlan({
    db: mutable,
    scheduleDay,
    visits: dayVisits
  });
  if (!routePlan.recommendationChanged) {
    return db;
  }

  routePlan.recommended.orderedVisitIds.forEach((visitId, index) => {
    const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);
    if (visitIndex >= 0) {
      mutable.scheduledVisits[visitIndex] = {
        ...mutable.scheduledVisits[visitIndex],
        order_index: index + 1
      };
    }
  });

  const scheduleDayIndex = mutable.scheduleDays.findIndex((day) => day.id === scheduleDayId);
  if (scheduleDayIndex >= 0) {
    mutable.scheduleDays[scheduleDayIndex] = {
      ...mutable.scheduleDays[scheduleDayIndex],
      travel_buffer_min: routePlan.recommended.suggestedTravelBufferMin
    };
  }

  applyEstimationWindowsToVisits(mutable, scheduleDayId, {
    travelBufferMin: routePlan.recommended.suggestedTravelBufferMin
  });

  return mutable;
}
