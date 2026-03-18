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
  buildInvoiceEmailPayload,
  generateInvoiceDraftsForPeriod,
  issueInvoice,
  listInvoices,
  markInvoiceFailed,
  markInvoicePaid,
  setInvoiceCommunicationStatus
} from "../invoices/invoicesService";

function isoAfterMinutes(iso, minutesToAdd) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return date.toISOString();
}

function queueInvoiceEmailJob(db, invoice) {
  const payload = buildInvoiceEmailPayload(db, invoice.id);
  if (!payload) {
    return {
      db,
      ok: false,
      message: "Invoice email payload is not available."
    };
  }

  const result = createCommunicationJob(db, {
    job_type: COMMUNICATION_JOB_TYPE.INVOICE_EMAIL,
    channel: "email",
    status: COMMUNICATION_JOB_STATUS.QUEUED,
    client_id: invoice.client_id,
    invoice_id: invoice.id,
    payload,
    max_attempts: 3
  });

  const nextDb = setInvoiceCommunicationStatus(result.db, invoice.id, "queued", null);
  return {
    db: nextDb,
    ok: true,
    job: result.job
  };
}

export function runInvoiceDraftGenerationCycle(db, periodStart, periodEnd) {
  return generateInvoiceDraftsForPeriod(db, periodStart, periodEnd);
}

export function queueInvoiceEmailDispatch(db, invoiceId) {
  const invoice = listInvoices(db).find((item) => item.id === invoiceId);
  if (!invoice) {
    return {
      db,
      ok: false,
      message: "Invoice not found."
    };
  }

  if (invoice.status !== "issued") {
    return {
      db,
      ok: false,
      message: "Only issued invoices can be dispatched."
    };
  }

  const existingJob = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.INVOICE_EMAIL
  }).find(
    (job) =>
      job.invoice_id === invoiceId &&
      [COMMUNICATION_JOB_STATUS.QUEUED, COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED, COMMUNICATION_JOB_STATUS.SENDING].includes(
        job.status
      )
  );

  if (existingJob) {
    return {
      db,
      ok: true,
      message: "Invoice email is already queued.",
      job: existingJob
    };
  }

  return queueInvoiceEmailJob(db, invoice);
}

function dispatchSingleInvoiceEmail(db, job, transport, nowIso) {
  let workingDb = db;
  const sendingJob = updateCommunicationJob(workingDb, job.id, {
    status: COMMUNICATION_JOB_STATUS.SENDING,
    attempt_count: job.attempt_count + 1,
    last_attempt_at: nowIso,
    error_message: null
  });
  workingDb = sendingJob.db;

  const sendResult = transport.send(job.payload, {
    attemptCount: job.attempt_count
  });

  if (sendResult.ok) {
    const sentJob = updateCommunicationJob(workingDb, job.id, {
      status: COMMUNICATION_JOB_STATUS.SENT,
      sent_at: nowIso,
      provider_ref: sendResult.providerRef ?? null
    });
    workingDb = sentJob.db;
    workingDb = setInvoiceCommunicationStatus(workingDb, job.invoice_id, "sent");

    return {
      db: workingDb,
      outcome: "sent"
    };
  }

  const nextAttemptCount = job.attempt_count + 1;
  const retryAvailable = nextAttemptCount < (job.max_attempts ?? 3);
  const nextJobStatus = retryAvailable ? COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED : COMMUNICATION_JOB_STATUS.FAILED;

  const failedJob = updateCommunicationJob(workingDb, job.id, {
    status: nextJobStatus,
    error_message: sendResult.error ?? "Delivery failed.",
    next_attempt_at: retryAvailable ? isoAfterMinutes(nowIso, 20) : null
  });
  workingDb = failedJob.db;
  workingDb = setInvoiceCommunicationStatus(
    workingDb,
    job.invoice_id,
    retryAvailable ? "retry_scheduled" : "failed",
    sendResult.error ?? "Delivery failed."
  );

  return {
    db: workingDb,
    outcome: retryAvailable ? "retry_scheduled" : "failed"
  };
}

export function runInvoiceDispatchCycle(db, options = {}) {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const transport = options.transport ?? getEmailTransport();
  const maxJobs = options.maxJobs ?? 20;

  const jobs = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.INVOICE_EMAIL
  }).filter(
    (job) =>
      [COMMUNICATION_JOB_STATUS.QUEUED, COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED].includes(job.status) &&
      (!job.next_attempt_at || job.next_attempt_at <= nowIso)
  );

  let workingDb = cloneDatabase(db);
  let sent = 0;
  let failed = 0;
  let retryScheduled = 0;
  let processed = 0;

  for (const job of jobs) {
    if (processed >= maxJobs) {
      break;
    }

    const result = dispatchSingleInvoiceEmail(workingDb, job, transport, nowIso);
    workingDb = result.db;
    processed += 1;

    if (result.outcome === "sent") {
      sent += 1;
    } else if (result.outcome === "retry_scheduled") {
      retryScheduled += 1;
    } else if (result.outcome === "failed") {
      failed += 1;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: `Invoice dispatch processed ${processed} job(s). Sent: ${sent}, retries: ${retryScheduled}, failed: ${failed}.`,
    summary: {
      processed,
      sent,
      retryScheduled,
      failed
    }
  };
}

export function retryInvoiceCommunicationJob(db, jobId) {
  const job = listCommunicationJobs(db, {
    type: COMMUNICATION_JOB_TYPE.INVOICE_EMAIL
  }).find((item) => item.id === jobId);

  if (!job) {
    return {
      db,
      ok: false,
      message: "Invoice communication job not found."
    };
  }

  const updated = updateCommunicationJob(db, job.id, {
    status: COMMUNICATION_JOB_STATUS.RETRY_SCHEDULED,
    next_attempt_at: new Date().toISOString(),
    error_message: null
  });

  const nextDb = setInvoiceCommunicationStatus(updated.db, job.invoice_id, "retry_scheduled", null);
  return {
    db: nextDb,
    ok: true,
    message: "Invoice communication retry scheduled."
  };
}

export function changeInvoiceStatus(db, invoiceId, nextStatus) {
  if (nextStatus === "issued") {
    return issueInvoice(db, invoiceId);
  }

  if (nextStatus === "paid") {
    return markInvoicePaid(db, invoiceId);
  }

  if (nextStatus === "failed") {
    return markInvoiceFailed(db, invoiceId, "Marked as failed by operator.");
  }

  return {
    db,
    ok: false,
    message: "Unsupported invoice status transition."
  };
}
