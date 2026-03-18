import { buildNextId, cloneDatabase, findById } from "../helpers";
import { getLatestJobForRecord } from "../communications/communicationJobsService";

export function buildVisitReminderEmail(db, visitId) {
  const visit = findById(db.scheduledVisits, visitId);
  if (!visit) {
    return null;
  }

  const client = findById(db.clients, visit.client_id);
  if (!client || !client.email) {
    return null;
  }

  const serviceType = findById(db.serviceTypes, visit.service_type_id);

  return {
    to: client.email,
    subject: `Reminder: ${serviceType?.name ?? "Cleaning"} on ${visit.date} at ${visit.estimated_start}`,
    body: [
      `Hi ${client.full_name.split(" ")[0]},`,
      "",
      `This is a reminder that your cleaning service is scheduled for ${visit.date} at ${visit.estimated_start}.`,
      `Service type: ${serviceType?.name ?? "Cleaning Service"}`,
      `Address: ${client.address}`,
      "",
      "If you need to contact our operations team, reply to this message.",
      "",
      "Cleaner Ops Team"
    ].join("\n"),
    metadata: {
      client_id: client.id,
      scheduled_visit_id: visit.id
    }
  };
}

function enrichReminder(db, reminder) {
  const client = findById(db.clients, reminder.client_id);
  const visit = findById(db.scheduledVisits, reminder.scheduled_visit_id);
  const latestJob = getLatestJobForRecord(db, {
    reminder_id: reminder.id
  });

  return {
    ...reminder,
    client_name: client?.full_name ?? "-",
    visit_date: visit?.date ?? "-",
    estimated_start: visit?.estimated_start ?? "-",
    latest_job_id: latestJob?.id ?? null,
    latest_job_status: latestJob?.status ?? null
  };
}

export function listReminders(db, filters = {}) {
  const { status = "all", includePast = true } = filters;
  const sorted = (db.reminders ?? [])
    .map((item) => enrichReminder(db, item))
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return sorted.filter((item) => {
    if (status !== "all" && item.status !== status) {
      return false;
    }

    if (!includePast && item.status === "sent") {
      return false;
    }

    return true;
  });
}

export function createReminderForVisit(db, visitId, scheduledAt = null) {
  const mutable = cloneDatabase(db);
  const visit = findById(mutable.scheduledVisits, visitId);

  if (!visit) {
    return {
      db,
      ok: false,
      message: "Visit not found."
    };
  }

  const existing = mutable.reminders.find((reminder) => reminder.scheduled_visit_id === visitId);
  if (existing) {
    return {
      db: mutable,
      ok: true,
      reminder: existing,
      message: "Reminder already exists."
    };
  }

  const payload = buildVisitReminderEmail(mutable, visitId);
  if (!payload) {
    return {
      db,
      ok: false,
      message: "Client email is missing for reminder."
    };
  }

  const nowIso = new Date().toISOString();
  const reminder = {
    id: buildNextId(mutable.reminders, "rm-"),
    client_id: visit.client_id,
    scheduled_visit_id: visit.id,
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: scheduledAt ?? nowIso,
    status: "queued",
    attempt_count: 0,
    max_attempts: 3,
    next_attempt_at: scheduledAt ?? nowIso,
    last_attempt_at: null,
    sent_at: null,
    provider_ref: null,
    error_message: null,
    payload,
    created_at: nowIso,
    updated_at: nowIso
  };

  mutable.reminders.push(reminder);

  return {
    db: mutable,
    ok: true,
    reminder,
    message: "Reminder queued."
  };
}

export function updateReminderStatus(db, reminderId, patch) {
  const mutable = cloneDatabase(db);
  const index = mutable.reminders.findIndex((item) => item.id === reminderId);

  if (index < 0) {
    return {
      db,
      reminder: null
    };
  }

  mutable.reminders[index] = {
    ...mutable.reminders[index],
    ...patch,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    reminder: mutable.reminders[index]
  };
}

export function getReminderStats(db) {
  const reminders = listReminders(db);
  const counts = reminders.reduce((acc, reminder) => {
    const key = reminder.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: reminders.length,
    queued: counts.queued ?? 0,
    sending: counts.sending ?? 0,
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0,
    retry_scheduled: counts.retry_scheduled ?? 0
  };
}

export function getRemindersForDate(db, targetDate) {
  return listReminders(db).filter((reminder) => reminder.visit_date === targetDate);
}

