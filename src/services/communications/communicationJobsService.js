import { buildNextId, cloneDatabase, findById } from "../helpers";

export const COMMUNICATION_JOB_STATUS = {
  QUEUED: "queued",
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
  RETRY_SCHEDULED: "retry_scheduled",
  CANCELLED: "cancelled"
};

export const COMMUNICATION_JOB_TYPE = {
  REMINDER_EMAIL: "reminder_email",
  SERVICE_COMPLETION_EMAIL: "service_completion_email",
  INVOICE_EMAIL: "invoice_email"
};

const JOB_TYPES = Object.values(COMMUNICATION_JOB_TYPE);

function normalizeDate(value) {
  return value || new Date().toISOString();
}

export function createCommunicationJob(db, payload) {
  const mutable = cloneDatabase(db);
  const nowIso = new Date().toISOString();
  const job = {
    id: buildNextId(mutable.communicationJobs ?? [], "cj-"),
    job_type: payload.job_type,
    channel: payload.channel || "email",
    status: payload.status || COMMUNICATION_JOB_STATUS.QUEUED,
    client_id: payload.client_id ?? null,
    scheduled_visit_id: payload.scheduled_visit_id ?? null,
    reminder_id: payload.reminder_id ?? null,
    invoice_id: payload.invoice_id ?? null,
    attempt_count: payload.attempt_count ?? 0,
    max_attempts: payload.max_attempts ?? 3,
    next_attempt_at: normalizeDate(payload.next_attempt_at),
    last_attempt_at: payload.last_attempt_at ?? null,
    sent_at: payload.sent_at ?? null,
    provider_ref: payload.provider_ref ?? null,
    error_message: payload.error_message ?? null,
    payload: payload.payload ?? {},
    created_at: payload.created_at ?? nowIso,
    updated_at: payload.updated_at ?? nowIso
  };

  if (!mutable.communicationJobs) {
    mutable.communicationJobs = [];
  }

  mutable.communicationJobs.push(job);

  return {
    db: mutable,
    job
  };
}

export function updateCommunicationJob(db, jobId, patch) {
  const mutable = cloneDatabase(db);
  const index = (mutable.communicationJobs ?? []).findIndex((job) => job.id === jobId);
  if (index < 0) {
    return {
      db,
      job: null
    };
  }

  mutable.communicationJobs[index] = {
    ...mutable.communicationJobs[index],
    ...patch,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    job: mutable.communicationJobs[index]
  };
}

export function listCommunicationJobs(db, filters = {}) {
  const { type = "all", status = "all", channel = "all", includePastRetries = true } = filters;

  return (db.communicationJobs ?? [])
    .filter((job) => (type === "all" ? true : job.job_type === type))
    .filter((job) => (status === "all" ? true : job.status === status))
    .filter((job) => (channel === "all" ? true : job.channel === channel))
    .filter((job) => (includePastRetries ? true : job.status !== COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getCommunicationJobStats(db) {
  const jobs = db.communicationJobs ?? [];
  const counts = jobs.reduce((acc, job) => {
    const key = job.status;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: jobs.length,
    queued: counts.queued ?? 0,
    sending: counts.sending ?? 0,
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0,
    retry_scheduled: counts.retry_scheduled ?? 0
  };
}

function buildStatusCounts(jobs) {
  return jobs.reduce(
    (acc, job) => {
      acc.total += 1;
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      queued: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      retry_scheduled: 0
    }
  );
}

export function getCommunicationJobStatsByType(db) {
  const jobs = db.communicationJobs ?? [];

  const byType = JOB_TYPES.reduce((acc, type) => {
    const scopedJobs = jobs.filter((job) => job.job_type === type);
    acc[type] = buildStatusCounts(scopedJobs);
    return acc;
  }, {});

  return {
    overall: buildStatusCounts(jobs),
    byType
  };
}

export function listCommunicationJobsWithContext(db, filters = {}) {
  const jobs = listCommunicationJobs(db, filters);

  return jobs.map((job) => {
    const client = findById(db.clients ?? [], job.client_id);
    const visit = findById(db.scheduledVisits ?? [], job.scheduled_visit_id);
    const invoice = findById(db.invoices ?? [], job.invoice_id);

    return {
      ...job,
      client_name: client?.full_name ?? "-",
      visit_date: visit?.date ?? "-",
      invoice_number: invoice?.invoice_number ?? invoice?.id ?? null,
      subject: job.payload?.subject ?? "-",
      recipient: job.payload?.to ?? "-"
    };
  });
}

export function getLatestJobForRecord(db, match) {
  const jobs = listCommunicationJobs(db).filter((job) => {
    return Object.entries(match).every(([key, value]) => job[key] === value);
  });

  return jobs[0] ?? null;
}
