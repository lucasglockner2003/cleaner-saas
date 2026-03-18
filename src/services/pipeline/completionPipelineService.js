import { cloneDatabase, findById } from "../helpers";
import {
  COMMUNICATION_JOB_STATUS,
  COMMUNICATION_JOB_TYPE,
  createCommunicationJob,
  listCommunicationJobs,
  updateCommunicationJob
} from "../communications/communicationJobsService";
import { getEmailTransport } from "../communications/emailTransportService";
import { buildServiceCompletionEmailPayload } from "../completion/completionService";

function isoAfterMinutes(iso, minutesToAdd) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toISOString();
}

function isDispatchReady(job, nowIso) {
  return !job.next_attempt_at || job.next_attempt_at <= nowIso;
}

export function queueServiceCompletionEmail(db, visitId, options = {}) {
  const visit = findById(db.scheduledVisits, visitId);
  if (!visit) {
    return {
      db,
      ok: false,
      message: "Visit not found."
    };
  }

  if (visit.status !== "completed") {
    return {
      db,
      ok: false,
      message: "Only completed visits can queue completion communication."
    };
  }

  const payload = buildServiceCompletionEmailPayload(db, visitId, options);
  if (!payload) {
    return {
      db,
      ok: false,
      message: "Completion email payload could not be built."
    };
  }

  const duplicate = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
  }).find(
    (job) =>
      job.scheduled_visit_id === visitId &&
      [COMMUNICATION_JOB_STATUS.QUEUED, COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED, COMMUNICATION_JOB_STATUS.SENDING].includes(
        job.status
      )
  );

  if (duplicate) {
    return {
      db,
      ok: true,
      message: "Completion communication already queued.",
      job: duplicate
    };
  }

  const result = createCommunicationJob(db, {
    job_type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL,
    channel: "email",
    status: COMMUNICATION_JOB_STATUS.QUEUED,
    client_id: visit.client_id,
    scheduled_visit_id: visitId,
    invoice_id: payload.metadata?.invoice_id ?? null,
    payload,
    max_attempts: 3
  });

  return {
    db: result.db,
    ok: true,
    message: "Completion communication queued.",
    job: result.job
  };
}

function dispatchCompletionJob(db, job, transport, nowIso) {
  let workingDb = db;
  const sending = updateCommunicationJob(workingDb, job.id, {
    status: COMMUNICATION_JOB_STATUS.SENDING,
    attempt_count: job.attempt_count + 1,
    last_attempt_at: nowIso,
    error_message: null
  });
  workingDb = sending.db;

  const sendResult = transport.send(job.payload, {
    attemptCount: job.attempt_count
  });

  if (sendResult.ok) {
    const sent = updateCommunicationJob(workingDb, job.id, {
      status: COMMUNICATION_JOB_STATUS.SENT,
      sent_at: nowIso,
      provider_ref: sendResult.providerRef ?? null
    });
    return {
      db: sent.db,
      outcome: "sent"
    };
  }

  const nextAttempt = job.attempt_count + 1;
  const retryAvailable = nextAttempt < (job.max_attempts ?? 3);
  const status = retryAvailable ? COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED : COMMUNICATION_JOB_STATUS.FAILED;

  const failed = updateCommunicationJob(workingDb, job.id, {
    status,
    error_message: sendResult.error ?? "Completion email dispatch failed.",
    next_attempt_at: retryAvailable ? isoAfterMinutes(nowIso, 20) : null
  });

  return {
    db: failed.db,
    outcome: retryAvailable ? "retry_scheduled" : "failed"
  };
}

export function runServiceCompletionDispatchCycle(db, options = {}) {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const maxJobs = options.maxJobs ?? 20;
  const transport = options.transport ?? getEmailTransport();

  const jobs = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
  }).filter(
    (job) =>
      [COMMUNICATION_JOB_STATUS.QUEUED, COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED].includes(job.status) &&
      isDispatchReady(job, nowIso)
  );

  let workingDb = cloneDatabase(db);
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;

  for (const job of jobs) {
    if (processed >= maxJobs) {
      break;
    }

    const result = dispatchCompletionJob(workingDb, job, transport, nowIso);
    workingDb = result.db;
    processed += 1;

    if (result.outcome === "sent") {
      sent += 1;
    } else if (result.outcome === "failed") {
      failed += 1;
    } else if (result.outcome === "retry_scheduled") {
      retryScheduled += 1;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: `Completion communication cycle processed ${processed} job(s). Sent: ${sent}, retries: ${retryScheduled}, failed: ${failed}.`,
    summary: {
      processed,
      sent,
      retryScheduled,
      failed
    }
  };
}

export function retryCompletionCommunicationJob(db, jobId) {
  const job = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
  }).find((item) => item.id === jobId);

  if (!job) {
    return {
      db,
      ok: false,
      message: "Completion communication job not found."
    };
  }

  const updated = updateCommunicationJob(db, jobId, {
    status: COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED,
    next_attempt_at: new Date().toISOString(),
    error_message: null
  });

  return {
    db: updated.db,
    ok: true,
    message: "Completion communication retry scheduled."
  };
}

