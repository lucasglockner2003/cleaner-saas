import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { minutesBetween, parseTimeToMinutes } from "../../utils/dateTime";
import { durationDelta } from "../../utils/scheduleEstimator";
import { getLatestJobForRecord, COMMUNICATION_JOB_TYPE } from "../communications/communicationJobsService";
import {
  getVisitProofBundle,
  getVisitProofTimeline,
  uploadVisitPhotoWithProvider
} from "../photos/photoStorageService";

const VISIT_TRANSITIONS = {
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["scheduled"]
};

function calculateLatenessMin(visit, actualStart) {
  if (!visit.estimated_start || !actualStart) {
    return null;
  }

  const estimatedMin = parseTimeToMinutes(visit.estimated_start);
  const actual = new Date(actualStart);
  const actualMin = actual.getHours() * 60 + actual.getMinutes();
  return Math.max(0, actualMin - estimatedMin);
}

function getVisitLog(db, visitId) {
  return db.visitLogs.find((item) => item.scheduled_visit_id === visitId) ?? null;
}

function enrichVisit(db, visit) {
  const client = findById(db.clients, visit.client_id);
  const team = findById(db.teams, visit.team_id);
  const employee = findById(db.employees, visit.employee_id);
  const serviceType = findById(db.serviceTypes, visit.service_type_id);
  const log = getVisitLog(db, visit.id);
  const photos = db.visitPhotos.filter((item) => item.scheduled_visit_id === visit.id);
  const proofBundle = getVisitProofBundle(db, visit.id);
  const beforePhotos = proofBundle.coverage.before;
  const afterPhotos = proofBundle.coverage.after;
  const needsProof = visit.service_type_id === "st-move" || visit.service_type_id === "st-deep";
  const actualDurationMin = log?.actual_duration_min ?? null;
  const deltaMin = durationDelta(visit.estimated_duration_min, actualDurationMin);
  const completionJob = getLatestJobForRecord(db, {
    scheduled_visit_id: visit.id,
    job_type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
  });
  const invoice = (db.invoices ?? [])
    .filter((item) => item.client_id === visit.client_id && item.period_start.slice(0, 7) === visit.date.slice(0, 7))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  return {
    ...visit,
    client_name: client?.full_name ?? "-",
    suburb: client?.suburb ?? "-",
    team_name: team?.name ?? "-",
    employee_name: employee?.full_name ?? "-",
    service_type_name: serviceType?.name ?? "-",
    actual_start: log?.actual_start ?? null,
    actual_finish: log?.actual_finish ?? null,
    actual_duration_min: actualDurationMin,
    visit_notes: log?.notes ?? "",
    proof_summary: log?.proof_summary ?? "",
    photo_count: photos.length,
    before_photo_count: beforePhotos,
    after_photo_count: afterPhotos,
    needs_proof: needsProof,
    proof_ready: !needsProof || proofBundle.proofReady,
    proof_bundle: proofBundle,
    lateness_min: calculateLatenessMin(visit, log?.actual_start),
    delta_min: deltaMin,
    is_overrun: (deltaMin ?? 0) > 0,
    completion_communication_status: completionJob?.status ?? "not_queued",
    completion_job_id: completionJob?.id ?? null,
    completion_error: completionJob?.error_message ?? null,
    linked_invoice_id: invoice?.id ?? null,
    linked_invoice_number: invoice?.invoice_number ?? null
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
    actual_duration_min: visit.actual_duration_min,
    lateness_min: visit.lateness_min,
    delta_min: visit.delta_min
  }));
}

function setVisitStatus(db, visitId, nextStatus) {
  const mutable = cloneDatabase(db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return {
      db,
      ok: false,
      message: "Visit not found."
    };
  }

  const currentStatus = mutable.scheduledVisits[visitIndex].status;
  const allowed = VISIT_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(nextStatus)) {
    return {
      db,
      ok: false,
      message: `Cannot transition visit from ${currentStatus} to ${nextStatus}.`
    };
  }

  mutable.scheduledVisits[visitIndex].status = nextStatus;

  return {
    db: mutable,
    ok: true,
    message: ""
  };
}

export function startVisitExecution(db, visitId) {
  const statusResult = setVisitStatus(db, visitId, "in_progress");

  if (!statusResult.ok) {
    return statusResult;
  }

  const mutable = cloneDatabase(statusResult.db);
  const nowIso = new Date().toISOString();
  const existingLogIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);

  if (existingLogIndex >= 0) {
    mutable.visitLogs[existingLogIndex] = {
      ...mutable.visitLogs[existingLogIndex],
      actual_start: mutable.visitLogs[existingLogIndex].actual_start ?? nowIso,
      status: "in_progress"
    };
  } else {
    mutable.visitLogs.push({
      id: buildNextId(mutable.visitLogs, "vl-"),
      scheduled_visit_id: visitId,
      actual_start: nowIso,
      actual_finish: null,
      actual_duration_min: null,
      status: "in_progress",
      notes: "",
      proof_summary: "Before photos placeholder captured."
    });
  }

  return {
    db: mutable,
    ok: true,
    message: "Visit started."
  };
}

export function finishVisitExecution(db, visitId, notes = "") {
  const statusResult = setVisitStatus(db, visitId, "completed");

  if (!statusResult.ok) {
    return statusResult;
  }

  const mutable = cloneDatabase(statusResult.db);
  const visitIndex = mutable.scheduledVisits.findIndex((visit) => visit.id === visitId);

  if (visitIndex < 0) {
    return {
      db,
      ok: false,
      message: "Visit not found."
    };
  }

  const visit = mutable.scheduledVisits[visitIndex];
  const nowIso = new Date().toISOString();
  let log = mutable.visitLogs.find((item) => item.scheduled_visit_id === visitId);

  if (!log) {
    log = {
      id: buildNextId(mutable.visitLogs, "vl-"),
      scheduled_visit_id: visitId,
      actual_start: nowIso,
      actual_finish: nowIso,
      actual_duration_min: 0,
      status: "completed",
      notes: safeTrim(notes) || "Completed.",
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
      notes: safeTrim(notes) || safeTrim(log.notes) || "Completed.",
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

  return {
    db: mutable,
    ok: true,
    message: "Visit finished."
  };
}

export function cancelVisitExecution(db, visitId, reason = "Cancelled from operations board") {
  const statusResult = setVisitStatus(db, visitId, "cancelled");

  if (!statusResult.ok) {
    return statusResult;
  }

  const mutable = cloneDatabase(statusResult.db);
  const logIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);

  if (logIndex >= 0) {
    mutable.visitLogs[logIndex] = {
      ...mutable.visitLogs[logIndex],
      status: "cancelled",
      notes: safeTrim(reason) || mutable.visitLogs[logIndex].notes
    };
  } else {
    mutable.visitLogs.push({
      id: buildNextId(mutable.visitLogs, "vl-"),
      scheduled_visit_id: visitId,
      actual_start: null,
      actual_finish: null,
      actual_duration_min: null,
      status: "cancelled",
      notes: safeTrim(reason),
      proof_summary: "Visit cancelled before completion."
    });
  }

  return {
    db: mutable,
    ok: true,
    message: "Visit cancelled."
  };
}

export function reopenVisitToScheduled(db, visitId) {
  const statusResult = setVisitStatus(db, visitId, "scheduled");

  if (!statusResult.ok) {
    return statusResult;
  }

  const mutable = cloneDatabase(statusResult.db);
  const logIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);

  if (logIndex >= 0) {
    mutable.visitLogs[logIndex] = {
      ...mutable.visitLogs[logIndex],
      status: "scheduled",
      actual_start: null,
      actual_finish: null,
      actual_duration_min: null
    };
  }

  return {
    db: mutable,
    ok: true,
    message: "Visit moved back to scheduled."
  };
}

export function updateVisitExecutionNotes(db, visitId, notes) {
  const mutable = cloneDatabase(db);
  const cleanNotes = safeTrim(notes);
  const logIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);

  if (logIndex < 0) {
    mutable.visitLogs.push({
      id: buildNextId(mutable.visitLogs, "vl-"),
      scheduled_visit_id: visitId,
      actual_start: null,
      actual_finish: null,
      actual_duration_min: null,
      status: "scheduled",
      notes: cleanNotes,
      proof_summary: ""
    });
  } else {
    mutable.visitLogs[logIndex] = {
      ...mutable.visitLogs[logIndex],
      notes: cleanNotes
    };
  }

  return mutable;
}

export function addVisitPhotoPlaceholder(db, visitId, phase, fileName = "") {
  const uploadResult = uploadVisitPhotoWithProvider(db, {
    visitId,
    phase,
    fileName,
    metadata: {
      source: "visit_execution_panel"
    }
  });
  const mutable = uploadResult.db;
  const normalizedPhase = phase === "after" ? "after" : "before";

  const logIndex = mutable.visitLogs.findIndex((log) => log.scheduled_visit_id === visitId);
  if (logIndex >= 0) {
    const prefix = normalizedPhase === "before" ? "Before" : "After";
    const previous = safeTrim(mutable.visitLogs[logIndex].proof_summary);
    mutable.visitLogs[logIndex] = {
      ...mutable.visitLogs[logIndex],
      proof_summary: previous ? `${previous} | ${prefix} photo added.` : `${prefix} photo added.`
    };
  }

  return {
    db: mutable,
    ok: uploadResult.ok,
    message: uploadResult.ok
      ? "Photo proof metadata recorded."
      : "Photo metadata recorded, but provider upload reported a failure."
  };
}

export function getVisitExecutionSnapshot(db, visitId) {
  const visit = listVisits(db).find((item) => item.id === visitId);
  if (!visit) {
    return null;
  }

  const photos = db.visitPhotos.filter((photo) => photo.scheduled_visit_id === visitId);
  const beforePhotos = photos.filter((photo) => photo.phase === "before");
  const afterPhotos = photos.filter((photo) => photo.phase === "after");
  const proofTimeline = getVisitProofTimeline(db, visitId);

  return {
    visit,
    photos,
    beforePhotos,
    afterPhotos,
    proofTimeline,
    metrics: {
      latenessMin: visit.lateness_min,
      deltaMin: visit.delta_min,
      overrun: visit.is_overrun,
      proofReady: visit.proof_ready
    }
  };
}

export function getVisitPerformanceSummary(db) {
  const visits = listVisits(db);
  const completed = visits.filter((visit) => visit.status === "completed");
  const averageDelta =
    completed.length > 0
      ? Math.round(completed.reduce((total, visit) => total + (visit.delta_min ?? 0), 0) / completed.length)
      : 0;
  const lateStarts = visits.filter((visit) => (visit.lateness_min ?? 0) > 0).length;
  const overrun = completed.filter((visit) => (visit.delta_min ?? 0) > 0).length;

  return {
    total: visits.length,
    completed: completed.length,
    lateStarts,
    overrun,
    averageDelta
  };
}
