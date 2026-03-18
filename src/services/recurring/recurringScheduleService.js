import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { minutesToTime, parseTimeToMinutes, todayIsoDate } from "../../utils/dateTime";

export const RECURRING_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  ENDED: "ended"
};

export const RECURRING_PATTERN = {
  WEEKLY: "weekly",
  FORTNIGHTLY: "fortnightly",
  MONTHLY: "monthly",
  CUSTOM: "custom"
};

const WEEKDAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

function dateToIso(date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

function daysBetween(startDate, endDate) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function monthsBetween(startDate, endDate) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
}

function weekdayName(isoDate) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(parseIsoDate(isoDate));
}

function normalizeRecurringPayload(payload = {}) {
  const patternType = safeTrim(payload.pattern_type).toLowerCase() || RECURRING_PATTERN.WEEKLY;
  return {
    client_id: safeTrim(payload.client_id),
    status: safeTrim(payload.status).toLowerCase() || RECURRING_STATUS.ACTIVE,
    pattern_type: patternType,
    interval_count: Number(payload.interval_count ?? (patternType === RECURRING_PATTERN.FORTNIGHTLY ? 2 : 1)),
    weekday: safeTrim(payload.weekday) || null,
    monthly_day: payload.monthly_day ? Number(payload.monthly_day) : null,
    custom_interval_days: payload.custom_interval_days ? Number(payload.custom_interval_days) : null,
    window_start: safeTrim(payload.window_start) || "08:00",
    window_end: safeTrim(payload.window_end) || "12:00",
    start_date: safeTrim(payload.start_date) || todayIsoDate(),
    end_date: safeTrim(payload.end_date) || null,
    service_type_id: safeTrim(payload.service_type_id),
    estimated_duration_min: Number(payload.estimated_duration_min ?? 90),
    preferred_team_id: safeTrim(payload.preferred_team_id) || null,
    notes: safeTrim(payload.notes)
  };
}

export function validateRecurringPayload(db, payload = {}) {
  const normalized = normalizeRecurringPayload(payload);
  const errors = {};

  if (!normalized.client_id || !(db.clients ?? []).some((client) => client.id === normalized.client_id)) {
    errors.client_id = "Valid client is required.";
  }

  if (!normalized.service_type_id || !(db.serviceTypes ?? []).some((item) => item.id === normalized.service_type_id)) {
    errors.service_type_id = "Valid service type is required.";
  }

  if (!Object.values(RECURRING_PATTERN).includes(normalized.pattern_type)) {
    errors.pattern_type = "Invalid recurrence pattern.";
  }

  if (Number.isNaN(normalized.interval_count) || normalized.interval_count < 1 || normalized.interval_count > 12) {
    errors.interval_count = "Interval must be between 1 and 12.";
  }

  if (Number.isNaN(normalized.estimated_duration_min) || normalized.estimated_duration_min < 30) {
    errors.estimated_duration_min = "Estimated duration must be at least 30 minutes.";
  }

  if (parseTimeToMinutes(normalized.window_start) >= parseTimeToMinutes(normalized.window_end)) {
    errors.window_end = "Window end must be after window start.";
  }

  if (normalized.end_date && normalized.end_date < normalized.start_date) {
    errors.end_date = "End date cannot be earlier than start date.";
  }

  if (normalized.pattern_type === RECURRING_PATTERN.MONTHLY) {
    if (!normalized.monthly_day || normalized.monthly_day < 1 || normalized.monthly_day > 31) {
      errors.monthly_day = "Monthly recurrence requires day-of-month (1-31).";
    }
  } else if (normalized.pattern_type === RECURRING_PATTERN.CUSTOM) {
    if (!normalized.custom_interval_days || normalized.custom_interval_days < 3 || normalized.custom_interval_days > 90) {
      errors.custom_interval_days = "Custom interval must be between 3 and 90 days.";
    }
  } else {
    if (!normalized.weekday || WEEKDAY_INDEX[normalized.weekday] == null) {
      errors.weekday = "Weekday is required for weekly or fortnightly recurrence.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

function matchesPattern(rule, targetDate) {
  if (targetDate < rule.start_date) {
    return false;
  }
  if (rule.end_date && targetDate > rule.end_date) {
    return false;
  }

  if (rule.pattern_type === RECURRING_PATTERN.MONTHLY) {
    const day = parseIsoDate(targetDate).getUTCDate();
    if (day !== (rule.monthly_day ?? parseIsoDate(rule.start_date).getUTCDate())) {
      return false;
    }
    return monthsBetween(rule.start_date, targetDate) % Math.max(1, rule.interval_count) === 0;
  }

  if (rule.pattern_type === RECURRING_PATTERN.CUSTOM) {
    const interval = Math.max(1, rule.custom_interval_days ?? 14);
    return daysBetween(rule.start_date, targetDate) % interval === 0;
  }

  const effectiveInterval =
    rule.pattern_type === RECURRING_PATTERN.FORTNIGHTLY ? 2 : Math.max(1, rule.interval_count);
  if (weekdayName(targetDate) !== rule.weekday) {
    return false;
  }

  return daysBetween(rule.start_date, targetDate) % (7 * effectiveInterval) === 0;
}

function enrichRecurringRow(db, recurringService) {
  const client = findById(db.clients ?? [], recurringService.client_id);
  const serviceType = findById(db.serviceTypes ?? [], recurringService.service_type_id);
  const team = findById(db.teams ?? [], recurringService.preferred_team_id);
  return {
    ...recurringService,
    client_name: client?.full_name ?? "-",
    service_type_name: serviceType?.name ?? "-",
    preferred_team_name: team?.name ?? "Any team"
  };
}

export function listRecurringPreferences(db, filters = {}) {
  const { status = "all", clientId = "all" } = filters;
  return (db.recurringServices ?? [])
    .filter((item) => (status === "all" ? true : item.status === status))
    .filter((item) => (clientId === "all" ? true : item.client_id === clientId))
    .map((item) => enrichRecurringRow(db, item))
    .sort((a, b) => a.next_service_date.localeCompare(b.next_service_date));
}

export function projectRecurringOccurrences(db, recurringServiceId, options = {}) {
  const recurringService = (db.recurringServices ?? []).find((item) => item.id === recurringServiceId);
  if (!recurringService) {
    return [];
  }

  const fromDate = options.fromDate ?? todayIsoDate();
  const horizonDays = options.horizonDays ?? 60;
  const maxOccurrences = options.maxOccurrences ?? 20;
  const startDate = recurringService.next_service_date && recurringService.next_service_date > fromDate
    ? recurringService.next_service_date
    : fromDate;
  const untilDate = addDays(startDate, horizonDays);
  const occurrences = [];

  let cursor = startDate;
  while (cursor <= untilDate && occurrences.length < maxOccurrences) {
    if (matchesPattern(recurringService, cursor)) {
      const hasScheduled = (db.scheduledVisits ?? []).some(
        (visit) =>
          visit.client_id === recurringService.client_id &&
          visit.date === cursor &&
          visit.service_type_id === recurringService.service_type_id &&
          visit.status !== "cancelled"
      );

      occurrences.push({
        recurrence_id: recurringService.id,
        client_id: recurringService.client_id,
        client_name: findById(db.clients ?? [], recurringService.client_id)?.full_name ?? "-",
        date: cursor,
        window_start: recurringService.window_start,
        window_end: recurringService.window_end,
        service_type_id: recurringService.service_type_id,
        service_type_name: findById(db.serviceTypes ?? [], recurringService.service_type_id)?.name ?? "-",
        estimated_duration_min: recurringService.estimated_duration_min,
        preferred_team_id: recurringService.preferred_team_id,
        preferred_team_name: findById(db.teams ?? [], recurringService.preferred_team_id)?.name ?? "Any team",
        status: hasScheduled ? "already_scheduled" : "projected"
      });
    }

    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

export function projectAllRecurringServices(db, options = {}) {
  const rows = (db.recurringServices ?? []).filter((item) => item.status === RECURRING_STATUS.ACTIVE);
  return rows
    .flatMap((item) => projectRecurringOccurrences(db, item.id, options))
    .sort((a, b) => `${a.date}-${a.window_start}`.localeCompare(`${b.date}-${b.window_start}`));
}

export function createRecurringPreference(db, payload) {
  const mutable = cloneDatabase(db);
  if (!mutable.recurringServices) {
    mutable.recurringServices = [];
  }
  const validation = validateRecurringPayload(mutable, payload);
  if (!validation.isValid) {
    return {
      db,
      ok: false,
      errors: validation.errors,
      message: "Recurring service validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  const normalized = validation.normalized;
  const recurring = {
    id: buildNextId(mutable.recurringServices, "rs-"),
    ...normalized,
    frequency:
      normalized.pattern_type === RECURRING_PATTERN.FORTNIGHTLY
        ? "Fortnightly"
        : normalized.pattern_type.charAt(0).toUpperCase() + normalized.pattern_type.slice(1),
    next_service_date: normalized.start_date,
    last_generated_at: null,
    created_at: nowIso,
    updated_at: nowIso
  };

  mutable.recurringServices.push(recurring);

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Recurring service created."
  };
}

export function updateRecurringPreference(db, recurringServiceId, payload) {
  const mutable = cloneDatabase(db);
  const index = (mutable.recurringServices ?? []).findIndex((item) => item.id === recurringServiceId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Recurring service not found."
    };
  }

  const current = mutable.recurringServices[index];
  const merged = {
    ...current,
    ...payload
  };
  const validation = validateRecurringPayload(mutable, merged);
  if (!validation.isValid) {
    return {
      db,
      ok: false,
      errors: validation.errors,
      message: "Recurring service validation failed."
    };
  }

  mutable.recurringServices[index] = {
    ...current,
    ...validation.normalized,
    frequency:
      validation.normalized.pattern_type === RECURRING_PATTERN.FORTNIGHTLY
        ? "Fortnightly"
        : validation.normalized.pattern_type.charAt(0).toUpperCase() + validation.normalized.pattern_type.slice(1),
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Recurring service updated."
  };
}

export function setRecurringStatus(db, recurringServiceId, status) {
  const mutable = cloneDatabase(db);
  const index = (mutable.recurringServices ?? []).findIndex((item) => item.id === recurringServiceId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Recurring service not found."
    };
  }

  mutable.recurringServices[index] = {
    ...mutable.recurringServices[index],
    status,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: `Recurring service marked as ${status}.`
  };
}

function findOrCreateScheduleDayForRecurring(db, teamId, date) {
  const existing = (db.scheduleDays ?? []).find((item) => item.team_id === teamId && item.date === date);
  if (existing) {
    return existing;
  }

  const created = {
    id: buildNextId(db.scheduleDays ?? [], "sd-"),
    date,
    day_name: weekdayName(date),
    team_id: teamId,
    start_time: "08:00",
    break_duration_min: 30
  };

  if (!db.scheduleDays) {
    db.scheduleDays = [];
  }
  db.scheduleDays.push(created);
  return created;
}

export function materializeRecurringOccurrence(db, recurringServiceId, occurrenceDate, options = {}) {
  const mutable = cloneDatabase(db);
  const recurring = (mutable.recurringServices ?? []).find((item) => item.id === recurringServiceId);
  if (!recurring) {
    return {
      db,
      ok: false,
      message: "Recurring service not found."
    };
  }

  if (recurring.status !== RECURRING_STATUS.ACTIVE) {
    return {
      db,
      ok: false,
      message: "Only active recurring services can materialize visits."
    };
  }

  if (!matchesPattern(recurring, occurrenceDate)) {
    return {
      db,
      ok: false,
      message: "Selected date does not match recurrence rule."
    };
  }

  const duplicate = (mutable.scheduledVisits ?? []).find(
    (visit) =>
      visit.client_id === recurring.client_id &&
      visit.date === occurrenceDate &&
      visit.service_type_id === recurring.service_type_id &&
      visit.status !== "cancelled"
  );
  if (duplicate) {
    return {
      db,
      ok: false,
      message: "A visit already exists for this recurrence on the selected date."
    };
  }

  const assignedTeamId = options.teamId || recurring.preferred_team_id || (mutable.teams ?? [])[0]?.id;
  if (!assignedTeamId) {
    return {
      db,
      ok: false,
      message: "No team is available for this recurring visit."
    };
  }

  const assignedEmployeeId =
    options.employeeId ||
    (mutable.employees ?? []).find((employee) => employee.team_id === assignedTeamId && employee.status === "active")?.id ||
    null;
  const scheduleDay = findOrCreateScheduleDayForRecurring(mutable, assignedTeamId, occurrenceDate);
  const dayVisits = (mutable.scheduledVisits ?? []).filter((item) => item.schedule_day_id === scheduleDay.id);
  const orderIndex = dayVisits.length ? Math.max(...dayVisits.map((item) => item.order_index)) + 1 : 1;
  const startTime = recurring.window_start || scheduleDay.start_time || "08:00";
  const endTime = minutesToTime(parseTimeToMinutes(startTime) + recurring.estimated_duration_min);

  const newVisit = {
    id: buildNextId(mutable.scheduledVisits ?? [], "v-"),
    client_id: recurring.client_id,
    team_id: assignedTeamId,
    employee_id: assignedEmployeeId,
    schedule_day_id: scheduleDay.id,
    order_index: orderIndex,
    estimated_start: startTime,
    estimated_end: endTime,
    estimated_duration_min: recurring.estimated_duration_min,
    status: "scheduled",
    service_type_id: recurring.service_type_id,
    date: occurrenceDate,
    price: findById(mutable.serviceTypes ?? [], recurring.service_type_id)?.default_price ?? 130
  };

  if (!mutable.scheduledVisits) {
    mutable.scheduledVisits = [];
  }
  mutable.scheduledVisits.push(newVisit);

  const recurrenceIndex = mutable.recurringServices.findIndex((item) => item.id === recurringServiceId);
  const nextProjected = projectRecurringOccurrences(mutable, recurringServiceId, {
    fromDate: addDays(occurrenceDate, 1),
    horizonDays: 180,
    maxOccurrences: 1
  })[0];
  mutable.recurringServices[recurrenceIndex] = {
    ...mutable.recurringServices[recurrenceIndex],
    next_service_date: nextProjected?.date ?? mutable.recurringServices[recurrenceIndex].next_service_date,
    last_generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: "Recurring occurrence added to schedule."
  };
}

export function getRecurringOperationalOverview(db, options = {}) {
  const recurring = listRecurringPreferences(db);
  const projected = projectAllRecurringServices(db, options);
  const summary = recurring.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      active: 0,
      paused: 0,
      ended: 0
    }
  );

  return {
    summary,
    projected: projected.slice(0, 40)
  };
}
