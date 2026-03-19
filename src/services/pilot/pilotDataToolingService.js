import { WEEK_DAYS } from "../../constants/status";
import { minutesToTime, parseTimeToMinutes, todayIsoDate } from "../../utils/dateTime";
import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { createClientRecord, setClientStatus } from "../clients/clientsService";
import { addVisitPhotoPlaceholder, cancelVisitExecution, finishVisitExecution, startVisitExecution } from "../visits/visitsService";
import { queueServiceCompletionEmail } from "../pipeline/completionPipelineService";
import { COMMUNICATION_JOB_STATUS, COMMUNICATION_JOB_TYPE, listCommunicationJobs, updateCommunicationJob } from "../communications/communicationJobsService";
import { changeInvoiceStatus, queueInvoiceEmailDispatch, runInvoiceDraftGenerationCycle } from "../pipeline/invoicePipelineService";
import { createPaymentRecord } from "../payments/paymentsService";
import { CLIENT_CSV_PILOT_SAMPLE, CLIENT_CSV_TEMPLATE } from "./pilotCsvSamples";

const HEADER_ALIASES = {
  full_name: "full_name",
  fullname: "full_name",
  name: "full_name",
  client_name: "full_name",
  phone: "phone",
  mobile: "phone",
  email: "email",
  suburb: "suburb",
  neighborhood: "suburb",
  address: "address",
  full_address: "address",
  service_type_id: "service_type_id",
  service_type: "service_type",
  service_type_name: "service_type",
  frequency: "cleaning_frequency",
  cleaning_frequency: "cleaning_frequency",
  estimated_duration: "estimated_duration_min",
  estimated_duration_min: "estimated_duration_min",
  duration_min: "estimated_duration_min",
  notes: "notes_summary",
  notes_summary: "notes_summary",
  special_instructions: "special_instructions",
  instructions: "special_instructions",
  acquisition_source: "acquisition_source",
  referral_source: "referral_source",
  status: "status"
};

function normalizeHeader(value) {
  return safeTrim(String(value || "").toLowerCase().replace(/\s+/g, "_"));
}

function parseCsvRows(text) {
  const input = String(text || "").replace(/\uFEFF/g, "");
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.some((item) => safeTrim(item) !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((item) => safeTrim(item) !== "")) {
    rows.push(row);
  }

  return rows;
}

function toInteger(value, fallback) {
  if (value == null) {
    return fallback;
  }

  const normalized = safeTrim(String(value));
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.round(parsed);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function fromIsoDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function addDays(dateValue, days) {
  const next = new Date(dateValue);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isDateWithinRange(value, start, end) {
  return value >= start && value <= end;
}

function mondayFromDate(value) {
  const fallback = fromIsoDate(todayIsoDate());
  const seed = fromIsoDate(value) || fallback;
  const day = seed.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(seed, offset);
}

function resolveServiceTypeId(serviceTypes, rowMap) {
  const directId = safeTrim(rowMap.service_type_id || "");
  if (directId && serviceTypes.some((item) => item.id === directId)) {
    return directId;
  }

  const fromName = safeTrim(rowMap.service_type || "").toLowerCase();
  if (!fromName) {
    return serviceTypes[0]?.id || "";
  }

  const byName = serviceTypes.find((item) => String(item.name || "").toLowerCase() === fromName);
  if (byName) {
    return byName.id;
  }

  const byPartial = serviceTypes.find((item) => String(item.name || "").toLowerCase().includes(fromName));
  return byPartial?.id || serviceTypes[0]?.id || "";
}

function normalizeCsvRow(headers, rowValues) {
  return headers.reduce((acc, header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)] || normalizeHeader(header);
    acc[key] = safeTrim(rowValues[index] || "");
    return acc;
  }, {});
}

function buildCsvClientPayload(db, rowMap) {
  const serviceTypeId = resolveServiceTypeId(db.serviceTypes ?? [], rowMap);
  const serviceType = findById(db.serviceTypes ?? [], serviceTypeId);
  const statusValue = safeTrim(String(rowMap.status || "active").toLowerCase());
  const status = statusValue === "inactive" ? "inactive" : "active";

  return {
    payload: {
      full_name: rowMap.full_name || "",
      phone: rowMap.phone || "",
      email: rowMap.email || "",
      suburb: rowMap.suburb || "",
      address: rowMap.address || "",
      service_type_id: serviceTypeId,
      cleaning_frequency: rowMap.cleaning_frequency || "Weekly",
      estimated_duration_min: toInteger(rowMap.estimated_duration_min, serviceType?.default_duration_min || 90),
      acquisition_source: rowMap.acquisition_source || "manual",
      referral_source: rowMap.referral_source || "",
      notes_summary: rowMap.notes_summary || "",
      special_instructions: rowMap.special_instructions || ""
    },
    status
  };
}

function ensureArrayCollection(mutable, key) {
  if (!Array.isArray(mutable[key])) {
    mutable[key] = [];
  }
}

function clearWeekVisits(mutable, weekStart, weekEnd, removeCompleted) {
  const removedVisitIds = (mutable.scheduledVisits ?? [])
    .filter((visit) => {
      if (!isDateWithinRange(visit.date, weekStart, weekEnd)) {
        return false;
      }
      if (removeCompleted) {
        return true;
      }
      return visit.status !== "completed";
    })
    .map((visit) => visit.id);

  if (!removedVisitIds.length) {
    return 0;
  }

  mutable.scheduledVisits = (mutable.scheduledVisits ?? []).filter((visit) => !removedVisitIds.includes(visit.id));
  mutable.visitLogs = (mutable.visitLogs ?? []).filter((log) => !removedVisitIds.includes(log.scheduled_visit_id));
  mutable.visitPhotos = (mutable.visitPhotos ?? []).filter((photo) => !removedVisitIds.includes(photo.scheduled_visit_id));
  mutable.communicationJobs = (mutable.communicationJobs ?? []).filter((job) => !removedVisitIds.includes(job.scheduled_visit_id));
  mutable.reminders = (mutable.reminders ?? []).filter((reminder) => !removedVisitIds.includes(reminder.scheduled_visit_id));

  return removedVisitIds.length;
}

function ensureScheduleDay(mutable, team, dateIso) {
  const existing = (mutable.scheduleDays ?? []).find((item) => item.team_id === team.id && item.date === dateIso);
  if (existing) {
    return {
      day: existing,
      created: false
    };
  }

  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00.000Z`)
  );
  const created = {
    id: buildNextId(mutable.scheduleDays ?? [], "sd-"),
    date: dateIso,
    day_name: WEEK_DAYS.includes(dayName) ? dayName : dayName,
    team_id: team.id,
    start_time: "08:00",
    break_duration_min: 30,
    travel_buffer_min: 15,
    target_day_minutes: team.target_day_minutes ?? 480
  };

  ensureArrayCollection(mutable, "scheduleDays");
  mutable.scheduleDays.push(created);

  return {
    day: created,
    created: true
  };
}

function buildMonthRange(month) {
  if (!month) {
    return null;
  }
  const [yearRaw, monthRaw] = String(month).split("-");
  const year = Number(yearRaw);
  const monthValue = Number(monthRaw);
  if (!year || !monthValue) {
    return null;
  }

  const start = `${yearRaw}-${monthRaw}-01`;
  const end = new Date(Date.UTC(year, monthValue, 0)).toISOString().slice(0, 10);
  return {
    start,
    end
  };
}

function isoAfterMinutes(iso, minutesToAdd) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toISOString();
}

export function getClientCsvTemplate() {
  return CLIENT_CSV_TEMPLATE;
}

export function getClientCsvPilotSample() {
  return CLIENT_CSV_PILOT_SAMPLE;
}

export function importClientsFromCsv(db, csvText) {
  const rows = parseCsvRows(csvText);
  if (!rows.length) {
    return {
      db,
      ok: false,
      message: "CSV appears empty. Paste rows including a header line."
    };
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow.length) {
    return {
      db,
      ok: false,
      message: "CSV header row is missing."
    };
  }

  if (!dataRows.length) {
    return {
      db,
      ok: false,
      message: "CSV has no data rows to import."
    };
  }

  let workingDb = cloneDatabase(db);
  let imported = 0;
  const rowErrors = [];

  dataRows.forEach((rowValues, rowIndex) => {
    const rowMap = normalizeCsvRow(headerRow, rowValues);
    const prepared = buildCsvClientPayload(workingDb, rowMap);
    const created = createClientRecord(workingDb, prepared.payload);

    if (created.errors && Object.keys(created.errors).length) {
      rowErrors.push({
        row: rowIndex + 2,
        errors: created.errors
      });
      return;
    }

    workingDb = created.db;
    imported += 1;

    if (prepared.status === "inactive" && created.createdId) {
      workingDb = setClientStatus(workingDb, created.createdId, "inactive");
    }
  });

  if (!imported) {
    return {
      db,
      ok: false,
      message: "No rows imported. Review CSV validation errors.",
      errors: {
        root: rowErrors.slice(0, 3).map((item) => `Row ${item.row}: ${Object.values(item.errors).join(" | ")}`).join(" ; ")
      },
      summary: {
        rows: dataRows.length,
        imported: 0,
        failed: rowErrors.length
      }
    };
  }

  return {
    db: workingDb,
    ok: true,
    message: `Imported ${imported} client(s). ${rowErrors.length} row(s) skipped.`,
    summary: {
      rows: dataRows.length,
      imported,
      failed: rowErrors.length,
      sampleErrors: rowErrors.slice(0, 5)
    }
  };
}

export function generatePilotWeekSchedule(db, options = {}) {
  const weekStartDate = mondayFromDate(options.weekStartDate || todayIsoDate());
  const weekStart = toIsoDate(weekStartDate);
  const weekEnd = toIsoDate(addDays(weekStartDate, 4));
  const clearExistingWeek = options.clearExistingWeek !== false;
  const removeCompleted = options.removeCompleted === true;
  const maxClients = Math.max(1, toInteger(options.maxClients, 30));

  const mutable = cloneDatabase(db);
  ensureArrayCollection(mutable, "scheduledVisits");
  ensureArrayCollection(mutable, "scheduleDays");
  ensureArrayCollection(mutable, "visitLogs");
  ensureArrayCollection(mutable, "visitPhotos");
  ensureArrayCollection(mutable, "communicationJobs");
  ensureArrayCollection(mutable, "reminders");

  const activeTeams = (mutable.teams ?? []).filter((team) => team.is_active !== false);
  if (!activeTeams.length) {
    return {
      db,
      ok: false,
      message: "No active teams found. Create or activate a team first."
    };
  }

  const activeClients = (mutable.clients ?? [])
    .filter((client) => client.status === "active")
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .slice(0, maxClients);

  if (!activeClients.length) {
    return {
      db,
      ok: false,
      message: "No active clients found for schedule generation."
    };
  }

  let clearedVisits = 0;
  if (clearExistingWeek) {
    clearedVisits = clearWeekVisits(mutable, weekStart, weekEnd, removeCompleted);
  }

  const weekDates = WEEK_DAYS.map((_, index) => toIsoDate(addDays(weekStartDate, index)));
  const teamEmployeeMap = activeTeams.reduce((acc, team) => {
    acc[team.id] = (mutable.employees ?? []).filter((employee) => employee.status === "active" && employee.team_id === team.id);
    return acc;
  }, {});

  const slotStates = [];
  let createdScheduleDays = 0;

  weekDates.forEach((dateIso) => {
    activeTeams.forEach((team) => {
      const scheduleDayResult = ensureScheduleDay(mutable, team, dateIso);
      if (scheduleDayResult.created) {
        createdScheduleDays += 1;
      }

      const existingVisits = (mutable.scheduledVisits ?? [])
        .filter((visit) => visit.schedule_day_id === scheduleDayResult.day.id)
        .sort((a, b) => a.order_index - b.order_index);
      const travelBufferMin = Number(scheduleDayResult.day.travel_buffer_min ?? 15);
      const breakDurationMin = Number(scheduleDayResult.day.break_duration_min ?? 30);
      const nextStartMin =
        existingVisits.length > 0
          ? parseTimeToMinutes(existingVisits[existingVisits.length - 1].estimated_end || "08:00") + travelBufferMin
          : parseTimeToMinutes(scheduleDayResult.day.start_time || "08:00");

      slotStates.push({
        key: `${dateIso}::${team.id}`,
        date: dateIso,
        scheduleDayId: scheduleDayResult.day.id,
        team,
        nextStartMin,
        travelBufferMin,
        breakDurationMin,
        orderIndex: existingVisits.length + 1,
        employeeCursor: 0,
        createdVisits: 0,
        breakApplied: false
      });
    });
  });

  if (!slotStates.length) {
    return {
      db,
      ok: false,
      message: "Unable to allocate schedule slots for the selected week."
    };
  }

  let createdVisits = 0;
  activeClients.forEach((client, index) => {
    const slot = slotStates[index % slotStates.length];
    const serviceType = findById(mutable.serviceTypes ?? [], client.service_type_id);
    const estimatedDuration = Math.max(45, toInteger(client.estimated_duration_min, serviceType?.default_duration_min || 90));
    const startMin = slot.nextStartMin;
    const endMin = startMin + estimatedDuration;
    const teamEmployees = teamEmployeeMap[slot.team.id] ?? [];
    const assignedEmployee =
      teamEmployees.length > 0 ? teamEmployees[slot.employeeCursor % teamEmployees.length] : null;

    mutable.scheduledVisits.push({
      id: buildNextId(mutable.scheduledVisits, "v-"),
      client_id: client.id,
      team_id: slot.team.id,
      employee_id: assignedEmployee?.id ?? null,
      schedule_day_id: slot.scheduleDayId,
      order_index: slot.orderIndex,
      estimated_start: minutesToTime(startMin),
      estimated_end: minutesToTime(endMin),
      estimated_duration_min: estimatedDuration,
      status: "scheduled",
      service_type_id: serviceType?.id ?? client.service_type_id,
      date: slot.date,
      price: Number(serviceType?.default_price ?? Math.max(95, Math.round(estimatedDuration * 1.8)))
    });

    slot.orderIndex += 1;
    slot.employeeCursor += 1;
    slot.createdVisits += 1;
    slot.nextStartMin = endMin + slot.travelBufferMin;
    if (!slot.breakApplied && slot.createdVisits === 2) {
      slot.nextStartMin += slot.breakDurationMin;
      slot.breakApplied = true;
    }

    createdVisits += 1;
  });

  return {
    db: mutable,
    ok: true,
    message: `Generated ${createdVisits} scheduled visit(s) for week ${weekStart} to ${weekEnd}.`,
    summary: {
      weekStart,
      weekEnd,
      activeTeams: activeTeams.length,
      selectedClients: activeClients.length,
      createdScheduleDays,
      createdVisits,
      clearedVisits
    }
  };
}

export function generateFakeVisitExecutions(db, options = {}) {
  const mutable = cloneDatabase(db);
  ensureArrayCollection(mutable, "visitLogs");
  ensureArrayCollection(mutable, "visitPhotos");
  ensureArrayCollection(mutable, "communicationJobs");

  const fromDate = safeTrim(options.fromDate) || todayIsoDate();
  const toDate = safeTrim(options.toDate) || fromDate;
  const rangeStart = fromDate <= toDate ? fromDate : toDate;
  const rangeEnd = fromDate <= toDate ? toDate : fromDate;
  const maxVisits = Math.max(1, toInteger(options.maxVisits, 25));
  const addProof = options.addProof !== false;

  const candidates = (mutable.scheduledVisits ?? [])
    .filter((visit) => visit.date >= rangeStart && visit.date <= rangeEnd)
    .filter((visit) => visit.status === "scheduled" || visit.status === "in_progress")
    .sort((a, b) => `${a.date}-${String(a.order_index).padStart(4, "0")}`.localeCompare(`${b.date}-${String(b.order_index).padStart(4, "0")}`))
    .slice(0, maxVisits);

  if (!candidates.length) {
    return {
      db,
      ok: false,
      message: "No scheduled/in-progress visits found in selected range."
    };
  }

  let processed = 0;
  let completed = 0;
  let inProgress = 0;
  let cancelled = 0;
  let untouched = 0;
  let photosAdded = 0;
  let completionSent = 0;
  let completionFailed = 0;
  let workingDb = mutable;

  candidates.forEach((visit, index) => {
    const selector = index % 10;
    processed += 1;

    if (selector <= 5) {
      if (visit.status === "scheduled") {
        const started = startVisitExecution(workingDb, visit.id);
        workingDb = started.db;
      }

      const finished = finishVisitExecution(workingDb, visit.id, "Synthetic completion for pilot validation.");
      workingDb = finished.db;

      const updatedVisit = findById(workingDb.scheduledVisits ?? [], visit.id);
      const logIndex = (workingDb.visitLogs ?? []).findIndex((log) => log.scheduled_visit_id === visit.id);
      if (updatedVisit && logIndex >= 0) {
        const estimatedStartMin = parseTimeToMinutes(updatedVisit.estimated_start || "08:00");
        const latenessMin = (index % 3) * 5;
        const actualDurationMin = Math.max(40, Number(updatedVisit.estimated_duration_min || 90) + ((index % 5) - 2) * 8);
        const actualStartIso = `${updatedVisit.date}T${minutesToTime(estimatedStartMin + latenessMin)}:00.000Z`;
        const actualFinishIso = isoAfterMinutes(actualStartIso, actualDurationMin);

        workingDb.visitLogs[logIndex] = {
          ...workingDb.visitLogs[logIndex],
          actual_start: actualStartIso,
          actual_finish: actualFinishIso,
          actual_duration_min: actualDurationMin,
          status: "completed",
          notes: `Synthetic completion run ${index + 1}.`,
          proof_summary: "Synthetic before/after proof recorded."
        };
      }

      if (addProof) {
        const hasBefore = (workingDb.visitPhotos ?? []).some((photo) => photo.scheduled_visit_id === visit.id && photo.phase === "before");
        const hasAfter = (workingDb.visitPhotos ?? []).some((photo) => photo.scheduled_visit_id === visit.id && photo.phase === "after");

        if (!hasBefore) {
          const beforeResult = addVisitPhotoPlaceholder(workingDb, visit.id, "before", `before-${visit.id}.jpg`);
          workingDb = beforeResult.db;
          photosAdded += 1;
        }
        if (!hasAfter) {
          const afterResult = addVisitPhotoPlaceholder(workingDb, visit.id, "after", `after-${visit.id}.jpg`);
          workingDb = afterResult.db;
          photosAdded += 1;
        }
      }

      const queuedCompletion = queueServiceCompletionEmail(workingDb, visit.id);
      workingDb = queuedCompletion.db;

      const completionJob = listCommunicationJobs(workingDb, {
        type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
      }).find((job) => job.scheduled_visit_id === visit.id);

      if (completionJob) {
        if (index % 4 === 0) {
          const failedJob = updateCommunicationJob(workingDb, completionJob.id, {
            status: COMMUNICATION_JOB_STATUS.FAILED,
            attempt_count: Math.max(completionJob.attempt_count, 1),
            error_message: "Synthetic dispatch failure.",
            next_attempt_at: null
          });
          workingDb = failedJob.db;
          completionFailed += 1;
        } else {
          const sentJob = updateCommunicationJob(workingDb, completionJob.id, {
            status: COMMUNICATION_JOB_STATUS.SENT,
            attempt_count: Math.max(completionJob.attempt_count, 1),
            sent_at: new Date().toISOString(),
            provider_ref: `mock-completion-${visit.id}`,
            error_message: null
          });
          workingDb = sentJob.db;
          completionSent += 1;
        }
      }

      completed += 1;
      return;
    }

    if (selector <= 7) {
      const started = startVisitExecution(workingDb, visit.id);
      workingDb = started.db;
      inProgress += 1;
      return;
    }

    if (selector === 8) {
      const cancelledResult = cancelVisitExecution(workingDb, visit.id, "Synthetic cancellation for pilot test.");
      workingDb = cancelledResult.db;
      cancelled += 1;
      return;
    }

    untouched += 1;
  });

  return {
    db: workingDb,
    ok: true,
    message: `Synthetic visit run processed ${processed} visit(s). Completed ${completed}, in-progress ${inProgress}, cancelled ${cancelled}.`,
    summary: {
      rangeStart,
      rangeEnd,
      processed,
      completed,
      inProgress,
      cancelled,
      untouched,
      photosAdded,
      completionSent,
      completionFailed
    }
  };
}

export function generateTestInvoices(db, options = {}) {
  const monthValue = safeTrim(options.month);
  const monthRange = buildMonthRange(monthValue || todayIsoDate().slice(0, 7));
  if (!monthRange) {
    return {
      db,
      ok: false,
      message: "Invalid month value. Use YYYY-MM."
    };
  }

  let workingDb = cloneDatabase(db);
  const draftResult = runInvoiceDraftGenerationCycle(workingDb, monthRange.start, monthRange.end);
  workingDb = draftResult.db;

  const issueDrafts = options.issueDrafts !== false;
  const queueEmail = options.queueEmail !== false;
  let issuedCount = 0;
  let queuedCount = 0;

  if (issueDrafts) {
    const draftInvoices = (workingDb.invoices ?? [])
      .filter((invoice) => invoice.period_start === monthRange.start && invoice.period_end === monthRange.end && invoice.status === "draft")
      .slice(0, Math.max(1, toInteger(options.maxIssue, 25)));

    draftInvoices.forEach((invoice) => {
      const issued = changeInvoiceStatus(workingDb, invoice.id, "issued");
      workingDb = issued.db;
      if (issued.ok) {
        issuedCount += 1;
      }

      if (queueEmail && issued.ok) {
        const queued = queueInvoiceEmailDispatch(workingDb, invoice.id);
        workingDb = queued.db;
        if (queued.ok) {
          queuedCount += 1;
        }
      }
    });
  }

  return {
    db: workingDb,
    ok: true,
    message: `Invoice tooling completed for ${monthValue || monthRange.start.slice(0, 7)}.`,
    summary: {
      month: monthValue || monthRange.start.slice(0, 7),
      createdDrafts: draftResult.summary?.created ?? 0,
      updatedDrafts: draftResult.summary?.updated ?? 0,
      issuedCount,
      queuedCount
    }
  };
}

function resolveSimulationStatus(mode, index) {
  const normalized = safeTrim(String(mode || "mixed").toLowerCase());
  if (["captured", "pending", "failed"].includes(normalized)) {
    return normalized;
  }

  const cycle = index % 4;
  if (cycle === 0 || cycle === 3) {
    return "captured";
  }
  if (cycle === 1) {
    return "pending";
  }
  return "failed";
}

export function simulateTestPayments(db, options = {}) {
  let workingDb = cloneDatabase(db);
  const mode = options.mode || "mixed";
  const provider = safeTrim(options.provider || "manual").toLowerCase() || "manual";
  const maxInvoices = Math.max(1, toInteger(options.maxInvoices, 8));
  const methodType = safeTrim(options.methodType || (provider === "manual" ? "bank_transfer" : "card")) || "bank_transfer";
  const amountMode = safeTrim(options.amountMode || "full").toLowerCase();

  const openInvoices = (workingDb.invoices ?? [])
    .filter((invoice) => invoice.status === "issued" && Number(invoice.balance_due ?? 0) > 0)
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
    .slice(0, maxInvoices);

  if (!openInvoices.length) {
    return {
      db,
      ok: false,
      message: "No issued invoices with balance due available for payment simulation."
    };
  }

  let created = 0;
  let captured = 0;
  let pending = 0;
  let failed = 0;
  const errors = [];

  openInvoices.forEach((invoice, index) => {
    const status = resolveSimulationStatus(mode, index);
    const invoiceAmount = Number(invoice.balance_due ?? invoice.total ?? 0);
    const amount =
      amountMode === "partial" && status === "captured"
        ? Number(Math.max(15, invoiceAmount * 0.55).toFixed(2))
        : Number(invoiceAmount.toFixed(2));

    const result = createPaymentRecord(workingDb, {
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount,
      currency: invoice.currency ?? "NZD",
      status,
      method_type: methodType,
      provider,
      notes: "Synthetic payment simulation from pilot tools.",
      failure_reason: status === "failed" ? "Synthetic provider decline." : null
    });

    if (!result.ok) {
      errors.push(`${invoice.invoice_number || invoice.id}: ${result.message}`);
      return;
    }

    if (result.idempotentReplay) {
      return;
    }

    workingDb = result.db;
    created += 1;
    if (status === "captured") {
      captured += 1;
    } else if (status === "pending") {
      pending += 1;
    } else if (status === "failed") {
      failed += 1;
    }
  });

  if (!created) {
    return {
      db,
      ok: false,
      message: "Payment simulation did not create new records.",
      errors: {
        root: errors[0] || "No eligible invoices."
      }
    };
  }

  return {
    db: workingDb,
    ok: true,
    message: `Created ${created} simulated payment(s): ${captured} captured, ${pending} pending, ${failed} failed.`,
    summary: {
      invoicesConsidered: openInvoices.length,
      created,
      captured,
      pending,
      failed,
      provider,
      mode
    }
  };
}
