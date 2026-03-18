import { cloneDatabase, findById } from "../helpers";
import { minutesBetween } from "../../utils/dateTime";
import { durationDelta } from "../../utils/scheduleEstimator";

function enrichVisit(db, visit) {
  const client = findById(db.clients, visit.client_id);
  const team = findById(db.teams, visit.team_id);
  const employee = findById(db.employees, visit.employee_id);
  const serviceType = findById(db.serviceTypes, visit.service_type_id);
  const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
  const photos = db.visitPhotos.filter((item) => item.scheduled_visit_id === visit.id);

  return {
    ...visit,
    client_name: client?.full_name ?? "-",
    suburb: client?.suburb ?? "-",
    team_name: team?.name ?? "-",
    employee_name: employee?.full_name ?? "-",
    service_type_name: serviceType?.name ?? "-",
    actual_start: log?.actual_start ?? null,
    actual_finish: log?.actual_finish ?? null,
    actual_duration_min: log?.actual_duration_min ?? null,
    visit_notes: log?.notes ?? "",
    proof_summary: log?.proof_summary ?? "",
    photo_count: photos.length,
    delta_min: durationDelta(visit.estimated_duration_min, log?.actual_duration_min)
  };
}

export function listVisits(db, filters = {}) {
  const { status = "all", day = "all", teamId = "all", suburb = "all" } = filters;

  return db.scheduledVisits
    .filter((visit) => (status === "all" ? true : visit.status === status))
    .filter((visit) => (day === "all" ? true : visit.date === day))
    .filter((visit) => (teamId === "all" ? true : visit.team_id === teamId))
    .map((visit) => enrichVisit(db, visit))
    .filter((visit) => (suburb === "all" ? true : visit.suburb === suburb))
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) {
        return byDate;
      }
      return a.order_index - b.order_index;
    });
}

export function getVisitHistoryTimeline(db) {
  return listVisits(db).map((visit) => ({
    id: visit.id,
    date: visit.date,
    title: `${visit.client_name} - ${visit.service_type_name}`,
    status: visit.status,
    team_name: visit.team_name,
    notes: visit.visit_notes,
    proof_summary: visit.proof_summary,
    photo_count: visit.photo_count,
    actual_duration_min: visit.actual_duration_min
  }));
}

export function startVisitExecution(db, visitId) {
  const mutable = cloneDatabase(db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return db;
  }

  const visit = mutable.scheduledVisits[visitIndex];

  if (visit.status === "completed") {
    return db;
  }

  const nowIso = new Date().toISOString();
  mutable.scheduledVisits[visitIndex].status = "in_progress";

  const existingLogIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);

  if (existingLogIndex >= 0) {
    mutable.visitLogs[existingLogIndex] = {
      ...mutable.visitLogs[existingLogIndex],
      actual_start: mutable.visitLogs[existingLogIndex].actual_start ?? nowIso,
      status: "in_progress"
    };
  } else {
    mutable.visitLogs.push({
      id: `vl-${String(mutable.visitLogs.length + 1).padStart(3, "0")}`,
      scheduled_visit_id: visitId,
      actual_start: nowIso,
      actual_finish: null,
      actual_duration_min: null,
      status: "in_progress",
      notes: "",
      proof_summary: "Before photos placeholder captured."
    });
  }

  return mutable;
}

export function finishVisitExecution(db, visitId, notes = "") {
  const mutable = cloneDatabase(db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return db;
  }

  const visit = mutable.scheduledVisits[visitIndex];
  const nowIso = new Date().toISOString();
  mutable.scheduledVisits[visitIndex].status = "completed";

  let log = mutable.visitLogs.find((item) => item.scheduled_visit_id === visitId);
  if (!log) {
    log = {
      id: `vl-${String(mutable.visitLogs.length + 1).padStart(3, "0")}`,
      scheduled_visit_id: visitId,
      actual_start: nowIso,
      actual_finish: nowIso,
      actual_duration_min: 0,
      status: "completed",
      notes: notes || "Completed.",
      proof_summary: "After photos placeholder pending."
    };
    mutable.visitLogs.push(log);
  } else {
    const logIndex = mutable.visitLogs.findIndex((item) => item.id === log.id);
    const actualStart = log.actual_start ?? nowIso;
    const duration = minutesBetween(actualStart, nowIso);
    mutable.visitLogs[logIndex] = {
      ...log,
      actual_start: actualStart,
      actual_finish: nowIso,
      actual_duration_min: duration,
      status: "completed",
      notes: notes || log.notes || "Completed.",
      proof_summary: "After photos placeholder pending."
    };
  }

  const client = findById(mutable.clients, visit.client_id);
  if (client) {
    const clientIndex = mutable.clients.findIndex((item) => item.id === client.id);
    mutable.clients[clientIndex] = {
      ...mutable.clients[clientIndex],
      last_cleaning_at: nowIso,
      updated_at: nowIso
    };
  }

  return mutable;
}

