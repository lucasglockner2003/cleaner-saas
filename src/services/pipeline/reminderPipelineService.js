import { cloneDatabase } from "../helpers";
import {
  COMMUNICATION_JOB_STATUS,
  COMMUNICATION_JOB_TYPE,
  createCommunicationJob,
  listCommunicationJobs,
  updateCommunicationJob
} from "../communications/communicationJobsService";
import { getEmailTransport } from "../communications/emailTransportService";
import {
  createReminderForVisit,
  getRemindersForDate,
  listReminders,
  updateReminderStatus
} from "../reminders/remindersService";

function isoAfterMinutes(iso, minutesToAdd) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toISOString();
}

function isReadyForSend(item, nowIso) {
  if (!item.next_attempt_at) {
    return true;
  }

  return item.next_attempt_at <= nowIso;
}

function toReminderJobPayload(reminder) {
  return {
    to: reminder.payload?.to,
    subject: reminder.payload?.subject,
    body: reminder.payload?.body,
    metadata: {
      reminder_id: reminder.id
    }
  };
}

function queueJobForReminder(db, reminder) {
  const result = createCommunicationJob(db, {
    job_type: COMMUNICATION_JOB_TYPE.REMINDER_EMAIL,
    channel: reminder.channel,
    status: COMMUNICATION_JOB_STATUS.QUEUED,
    client_id: reminder.client_id,
    scheduled_visit_id: reminder.scheduled_visit_id,
    reminder_id: reminder.id,
    payload: toReminderJobPayload(reminder),
    max_attempts: reminder.max_attempts ?? 3,
    next_attempt_at: reminder.next_attempt_at ?? reminder.scheduled_at
  });

  return result;
}

export function prepareReminderQueueForDate(db, targetDate, scheduledAt = null) {
  const mutable = cloneDatabase(db);
  const visits = mutable.scheduledVisits.filter((visit) => visit.date === targetDate && visit.status === "scheduled");

  let workingDb = mutable;
  const queuedReminderIds = [];
  const skipped = [];

  visits.forEach((visit) => {
    const existing = workingDb.reminders.find((item) => item.scheduled_visit_id === visit.id);
    if (existing) {
      skipped.push(visit.id);
      return;
    }

    const reminderResult = createReminderForVisit(workingDb, visit.id, scheduledAt);
    if (!reminderResult.ok) {
      skipped.push(visit.id);
      return;
    }

    workingDb = reminderResult.db;
    queuedReminderIds.push(reminderResult.reminder.id);
  });

  queuedReminderIds.forEach((reminderId) => {
    const reminder = workingDb.reminders.find((item) => item.id === reminderId);
    if (!reminder) {
      return;
    }

    const jobResult = queueJobForReminder(workingDb, reminder);
    workingDb = jobResult.db;
  });

  return {
    db: workingDb,
    ok: true,
    message: `Queued ${queuedReminderIds.length} reminder(s).`,
    queuedReminderIds,
    skippedVisitIds: skipped
  };
}

function dispatchSingleReminder(db, reminder, transport, nowIso) {
  let workingDb = db;
  const queuedJob = listCommunicationJobs(workingDb, {
    type: COMMUNICATION_JOB_TYPE.REMINDER_EMAIL
  }).find(
    (job) =>
      job.reminder_id === reminder.id &&
      (job.status === COMMUNICATION_JOB_STATUS.QUEUED || job.status === COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED) &&
      isReadyForSend(job, nowIso)
  );

  if (!queuedJob) {
    return {
      db: workingDb,
      outcome: "skipped"
    };
  }

  let jobUpdate = updateCommunicationJob(workingDb, queuedJob.id, {
    status: COMMUNICATION_JOB_STATUS.SENDING,
    last_attempt_at: nowIso,
    attempt_count: queuedJob.attempt_count + 1,
    error_message: null
  });
  workingDb = jobUpdate.db;

  const sendResult = transport.send(queuedJob.payload, {
    attemptCount: queuedJob.attempt_count
  });

  if (sendResult.ok) {
    jobUpdate = updateCommunicationJob(workingDb, queuedJob.id, {
      status: COMMUNICATION_JOB_STATUS.SENT,
      sent_at: nowIso,
      provider_ref: sendResult.providerRef ?? null
    });
    workingDb = jobUpdate.db;

    const reminderUpdate = updateReminderStatus(workingDb, reminder.id, {
      status: "sent",
      sent_at: nowIso,
      provider_ref: sendResult.providerRef ?? null,
      error_message: null,
      last_attempt_at: nowIso
    });

    return {
      db: reminderUpdate.db,
      outcome: "sent"
    };
  }

  const nextAttemptCount = queuedJob.attempt_count + 1;
  const retryAvailable = nextAttemptCount < (queuedJob.max_attempts ?? reminder.max_attempts ?? 3);
  const nextStatus = retryAvailable ? COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED : COMMUNICATION_JOB_STATUS.FAILED;
  const nextReminderStatus = retryAvailable ? "retry_scheduled" : "failed";

  jobUpdate = updateCommunicationJob(workingDb, queuedJob.id, {
    status: nextStatus,
    error_message: sendResult.error ?? "Delivery failed.",
    next_attempt_at: retryAvailable ? isoAfterMinutes(nowIso, 15) : null
  });
  workingDb = jobUpdate.db;

  const reminderUpdate = updateReminderStatus(workingDb, reminder.id, {
    status: nextReminderStatus,
    error_message: sendResult.error ?? "Delivery failed.",
    last_attempt_at: nowIso,
    attempt_count: nextAttemptCount,
    next_attempt_at: retryAvailable ? isoAfterMinutes(nowIso, 15) : null
  });

  return {
    db: reminderUpdate.db,
    outcome: retryAvailable ? "retry_scheduled" : "failed"
  };
}

export function runReminderDispatchCycle(db, options = {}) {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const transport = options.transport ?? getEmailTransport();
  const targetDate = options.targetDate ?? null;
  const maxJobs = options.maxJobs ?? 30;

  const reminders = (targetDate ? getRemindersForDate(db, targetDate) : listReminders(db)).filter((reminder) =>
    ["queued", "retry_scheduled"].includes(reminder.status)
  );

  let workingDb = cloneDatabase(db);
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let processed = 0;

  for (const reminder of reminders) {
    if (processed >= maxJobs) {
      break;
    }

    const result = dispatchSingleReminder(workingDb, reminder, transport, nowIso);
    workingDb = result.db;

    if (result.outcome === "sent") {
      sent += 1;
      processed += 1;
    } else if (result.outcome === "failed") {
      failed += 1;
      processed += 1;
    } else if (result.outcome === "retry_scheduled") {
      retryScheduled += 1;
      processed += 1;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: `Reminder cycle processed ${processed} job(s). Sent: ${sent}, retries: ${retryScheduled}, failed: ${failed}.`,
    summary: {
      processed,
      sent,
      retryScheduled,
      failed
    }
  };
}

export function retryReminderNow(db, reminderId) {
  const reminder = (db.reminders ?? []).find((item) => item.id === reminderId);
  if (!reminder) {
    return {
      db,
      ok: false,
      message: "Reminder record not found."
    };
  }

  let workingDb = db;
  const reminderUpdate = updateReminderStatus(workingDb, reminderId, {
    status: "retry_scheduled",
    next_attempt_at: new Date().toISOString(),
    error_message: null
  });
  workingDb = reminderUpdate.db;

  const latestJob = listCommunicationJobs(workingDb, {
    type: COMMUNICATION_JOB_TYPE.REMINDER_EMAIL
  }).find((job) => job.reminder_id === reminderId && job.status !== COMMUNICATION_JOB_STATUS.SENT);

  if (latestJob) {
    const updateResult = updateCommunicationJob(workingDb, latestJob.id, {
      status: COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED,
      next_attempt_at: new Date().toISOString(),
      error_message: null
    });
    workingDb = updateResult.db;
  } else {
    const reminderRecord = workingDb.reminders.find((item) => item.id === reminderId);
    if (reminderRecord) {
      const queuedResult = queueJobForReminder(workingDb, reminderRecord);
      workingDb = queuedResult.db;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: "Reminder retry scheduled."
  };
}

