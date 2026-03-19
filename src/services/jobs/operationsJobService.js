import { buildNextId, cloneDatabase, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";
import { refreshLifecycleSignals } from "../crm/crmService";
import { runInvoiceDispatchCycle } from "../pipeline/invoicePipelineService";
import { runReminderDispatchCycle } from "../pipeline/reminderPipelineService";
import { runPaymentReconciliationCycle } from "../payments/paymentsService";

export const OPERATION_JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRY_SCHEDULED: "retry_scheduled",
  CANCELLED: "cancelled"
};

export const OPERATION_JOB_TYPE = {
  REMINDER_DISPATCH: "reminder_dispatch",
  INVOICE_DISPATCH: "invoice_dispatch",
  LIFECYCLE_REFRESH: "lifecycle_refresh",
  PAYMENT_RECONCILIATION: "payment_reconciliation"
};

const RETRYABLE_STATUSES = [OPERATION_JOB_STATUS.QUEUED, OPERATION_JOB_STATUS.RETRY_SCHEDULED];

function ensureCollection(mutable) {
  if (!mutable.operationJobs) {
    mutable.operationJobs = [];
  }
}

function toIso(value) {
  return value || new Date().toISOString();
}

function isoAfterMinutes(iso, minutesToAdd) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toISOString();
}

function isLeaseExpired(job, nowIso) {
  if (!job.lock_expires_at) {
    return false;
  }
  return job.lock_expires_at <= nowIso;
}

function normalizeJobPayload(payload = {}) {
  return {
    job_type: safeTrim(payload.job_type).toLowerCase(),
    priority: Number(payload.priority ?? 5),
    scheduled_for: toIso(payload.scheduled_for),
    next_attempt_at: toIso(payload.next_attempt_at || payload.scheduled_for),
    max_attempts: Number(payload.max_attempts ?? 3),
    payload: payload.payload && typeof payload.payload === "object" ? payload.payload : {},
    created_by: safeTrim(payload.created_by) || "system"
  };
}

function isRunnableJob(job, nowIso) {
  return RETRYABLE_STATUSES.includes(job.status) && (!job.next_attempt_at || job.next_attempt_at <= nowIso);
}

function sortRunnableJobs(rows = []) {
  return [...rows].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return String(a.scheduled_for || "").localeCompare(String(b.scheduled_for || ""));
  });
}

export function listOperationJobs(db, filters = {}) {
  const { status = "all", type = "all" } = filters;
  return (db.operationJobs ?? [])
    .filter((job) => (status === "all" ? true : job.status === status))
    .filter((job) => (type === "all" ? true : job.job_type === type))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export function getOperationJobStats(db) {
  const rows = db.operationJobs ?? [];
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const byType = rows.reduce((acc, row) => {
    const bucket = acc[row.job_type] ?? { total: 0, queued: 0, running: 0, completed: 0, failed: 0, retry_scheduled: 0 };
    bucket.total += 1;
    bucket[row.status] = (bucket[row.status] ?? 0) + 1;
    acc[row.job_type] = bucket;
    return acc;
  }, {});

  return {
    total: rows.length,
    queued: counts.queued ?? 0,
    running: counts.running ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    retry_scheduled: counts.retry_scheduled ?? 0,
    byType
  };
}

export function createOperationJob(db, payload = {}) {
  const mutable = cloneDatabase(db);
  ensureCollection(mutable);
  const normalized = normalizeJobPayload(payload);

  if (!Object.values(OPERATION_JOB_TYPE).includes(normalized.job_type)) {
    return {
      db,
      ok: false,
      message: "Invalid operation job type."
    };
  }

  const nowIso = new Date().toISOString();
  mutable.operationJobs.push({
    id: buildNextId(mutable.operationJobs, "oj-"),
    organization_id: appEnv.organizationId,
    job_type: normalized.job_type,
    status: OPERATION_JOB_STATUS.QUEUED,
    priority: normalized.priority,
    scheduled_for: normalized.scheduled_for,
    next_attempt_at: normalized.next_attempt_at,
    started_at: null,
    finished_at: null,
    worker_id: null,
    lock_expires_at: null,
    attempt_count: 0,
    max_attempts: normalized.max_attempts,
    payload: normalized.payload,
    result_summary: null,
    error_message: null,
    created_by: normalized.created_by,
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    ok: true,
    message: "Operation job queued."
  };
}

function updateJob(mutable, jobId, patch = {}) {
  const index = (mutable.operationJobs ?? []).findIndex((row) => row.id === jobId);
  if (index < 0) {
    return null;
  }

  mutable.operationJobs[index] = {
    ...mutable.operationJobs[index],
    ...patch,
    updated_at: new Date().toISOString()
  };
  return mutable.operationJobs[index];
}

async function executeOperationJob(db, job) {
  const payload = job.payload ?? {};
  if (job.job_type === OPERATION_JOB_TYPE.REMINDER_DISPATCH) {
    return runReminderDispatchCycle(db, {
      targetDate: payload.targetDate ?? null,
      maxJobs: payload.maxJobs ?? 30
    });
  }

  if (job.job_type === OPERATION_JOB_TYPE.INVOICE_DISPATCH) {
    return runInvoiceDispatchCycle(db, {
      maxJobs: payload.maxJobs ?? 20
    });
  }

  if (job.job_type === OPERATION_JOB_TYPE.LIFECYCLE_REFRESH) {
    return refreshLifecycleSignals(db, payload);
  }

  if (job.job_type === OPERATION_JOB_TYPE.PAYMENT_RECONCILIATION) {
    return runPaymentReconciliationCycle(db, payload);
  }

  return {
    db,
    ok: false,
    message: "No handler registered for operation job type."
  };
}

export async function runOperationJobExecutorCycle(db, options = {}) {
  const mutable = cloneDatabase(db);
  ensureCollection(mutable);

  const nowIso = options.nowIso ?? new Date().toISOString();
  const maxJobs = Number(options.maxJobs ?? 20);
  const leaseMinutes = Number(options.leaseMinutes ?? 10);
  const workerId = safeTrim(options.workerId) || "ui-operator";
  const recoverStaleRunning = options.recoverStaleRunning !== false;

  if (recoverStaleRunning) {
    (mutable.operationJobs ?? []).forEach((job) => {
      if (job.status === OPERATION_JOB_STATUS.RUNNING && isLeaseExpired(job, nowIso)) {
        updateJob(mutable, job.id, {
          status: OPERATION_JOB_STATUS.RETRY_SCHEDULED,
          next_attempt_at: nowIso,
          error_message: "Recovered stale running job (lease expired).",
          worker_id: null,
          lock_expires_at: null
        });
      }
    });
  }

  const candidates = sortRunnableJobs((mutable.operationJobs ?? []).filter((job) => isRunnableJob(job, nowIso))).slice(0, maxJobs);
  let workingDb = mutable;
  let completed = 0;
  let failed = 0;
  let retryScheduled = 0;

  for (const job of candidates) {
    updateJob(workingDb, job.id, {
      status: OPERATION_JOB_STATUS.RUNNING,
      started_at: nowIso,
      attempt_count: (job.attempt_count ?? 0) + 1,
      error_message: null,
      worker_id: workerId,
      lock_expires_at: isoAfterMinutes(nowIso, leaseMinutes)
    });

    // eslint-disable-next-line no-await-in-loop
    const result = await executeOperationJob(workingDb, job);
    workingDb = result.db;

    if (result.ok) {
      updateJob(workingDb, job.id, {
        status: OPERATION_JOB_STATUS.COMPLETED,
        finished_at: new Date().toISOString(),
        next_attempt_at: null,
        result_summary: result.summary ?? { message: result.message },
        error_message: null,
        lock_expires_at: null
      });
      completed += 1;
      continue;
    }

    const currentAttempt = (job.attempt_count ?? 0) + 1;
    const retryAvailable = currentAttempt < (job.max_attempts ?? 3);
    updateJob(workingDb, job.id, {
      status: retryAvailable ? OPERATION_JOB_STATUS.RETRY_SCHEDULED : OPERATION_JOB_STATUS.FAILED,
      finished_at: retryAvailable ? null : new Date().toISOString(),
      next_attempt_at: retryAvailable ? isoAfterMinutes(nowIso, 15) : null,
      error_message: result.message || "Operation job failed.",
      lock_expires_at: null
    });

    if (retryAvailable) {
      retryScheduled += 1;
    } else {
      failed += 1;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: `Operation executor processed ${candidates.length} jobs. Completed: ${completed}, retries: ${retryScheduled}, failed: ${failed}.`,
    summary: {
      processed: candidates.length,
      completed,
      retryScheduled,
      failed
    }
  };
}

export function retryOperationJobNow(db, jobId) {
  const mutable = cloneDatabase(db);
  ensureCollection(mutable);
  const updated = updateJob(mutable, jobId, {
    status: OPERATION_JOB_STATUS.RETRY_SCHEDULED,
    next_attempt_at: new Date().toISOString(),
    error_message: null,
    worker_id: null,
    lock_expires_at: null
  });

  if (!updated) {
    return {
      db,
      ok: false,
      message: "Operation job not found."
    };
  }

  return {
    db: mutable,
    ok: true,
    message: "Operation job retry scheduled."
  };
}
