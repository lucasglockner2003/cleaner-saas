import { findById } from "../helpers";
import { getLatestJobForRecord } from "../communications/communicationJobsService";
import { COMMUNICATION_JOB_TYPE } from "../communications/communicationJobsService";

function getVisitPhotos(db, visitId) {
  return (db.visitPhotos ?? []).filter((photo) => photo.scheduled_visit_id === visitId);
}

function buildProofReferences(photos) {
  const grouped = photos.reduce(
    (acc, photo) => {
      if (photo.phase === "before") {
        acc.before.push(photo.public_url || photo.storage_path || photo.file_name);
      } else if (photo.phase === "after") {
        acc.after.push(photo.public_url || photo.storage_path || photo.file_name);
      }
      return acc;
    },
    { before: [], after: [] }
  );

  return grouped;
}

export function buildServiceCompletionEmailPayload(db, visitId, options = {}) {
  const visit = findById(db.scheduledVisits, visitId);
  if (!visit) {
    return null;
  }

  const client = findById(db.clients, visit.client_id);
  if (!client || !client.email) {
    return null;
  }

  const team = findById(db.teams, visit.team_id);
  const employee = findById(db.employees, visit.employee_id);
  const serviceType = findById(db.serviceTypes, visit.service_type_id);
  const log = (db.visitLogs ?? []).find((item) => item.scheduled_visit_id === visit.id);
  const photos = getVisitPhotos(db, visit.id);
  const proofs = buildProofReferences(photos);

  const invoice = options.invoiceId
    ? findById(db.invoices, options.invoiceId)
    : (db.invoices ?? []).find(
        (item) => item.client_id === client.id && item.period_start.slice(0, 7) === visit.date.slice(0, 7)
      );

  const ratingRequestUrl = `https://portal.cleanerops.local/feedback?visit=${visit.id}`;

  const bodyLines = [
    `Hi ${client.full_name.split(" ")[0]},`,
    "",
    "Your cleaning service has been completed. Here is a quick summary:",
    `- Date: ${visit.date}`,
    `- Service: ${serviceType?.name ?? "Cleaning service"}`,
    `- Team: ${team?.name ?? "N/A"}`,
    `- Cleaner: ${employee?.full_name ?? "N/A"}`,
    `- Estimated duration: ${visit.estimated_duration_min} min`,
    `- Actual duration: ${log?.actual_duration_min ?? "N/A"} min`,
    "",
    invoice ? `Invoice reference: ${invoice.invoice_number ?? invoice.id}` : "Invoice reference: pending generation",
    `Before proof assets: ${proofs.before.length}`,
    `After proof assets: ${proofs.after.length}`,
    "",
    `Feedback request: ${ratingRequestUrl}`,
    "",
    "Thank you for trusting our team.",
    "Cleaner Ops Team"
  ];

  return {
    to: client.email,
    subject: `Service completed - ${visit.date} (${serviceType?.name ?? "Cleaning"})`,
    body: bodyLines.join("\n"),
    metadata: {
      client_id: client.id,
      scheduled_visit_id: visit.id,
      invoice_id: invoice?.id ?? null,
      proof: proofs,
      rating_request_url: ratingRequestUrl
    }
  };
}

export function listCompletionCommunicationStatus(db) {
  const completedVisits = (db.scheduledVisits ?? []).filter((visit) => visit.status === "completed");

  return completedVisits.map((visit) => {
    const client = findById(db.clients, visit.client_id);
    const latestJob = getLatestJobForRecord(db, {
      scheduled_visit_id: visit.id,
      job_type: COMMUNICATION_JOB_TYPE.SERVICE_COMPLETION_EMAIL
    });
    const invoice = (db.invoices ?? [])
      .filter((item) => item.client_id === visit.client_id && item.period_start.slice(0, 7) === visit.date.slice(0, 7))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    const photos = getVisitPhotos(db, visit.id);
    const before = photos.filter((photo) => photo.phase === "before").length;
    const after = photos.filter((photo) => photo.phase === "after").length;

    return {
      visit_id: visit.id,
      date: visit.date,
      client_name: client?.full_name ?? "-",
      status: latestJob?.status ?? "not_queued",
      latest_job_id: latestJob?.id ?? null,
      error_message: latestJob?.error_message ?? null,
      invoice_id: invoice?.id ?? null,
      invoice_number: invoice?.invoice_number ?? null,
      before_count: before,
      after_count: after,
      proof_ready: before + after > 0
    };
  });
}

export function getCompletionCommunicationStats(db) {
  const rows = listCompletionCommunicationStatus(db);
  const counts = rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    if (row.proof_ready) {
      acc.proof_ready += 1;
    } else {
      acc.proof_missing += 1;
    }
    return acc;
  }, {
    total: 0,
    proof_ready: 0,
    proof_missing: 0
  });

  return {
    ...counts,
    not_queued: counts.not_queued ?? 0,
    queued: counts.queued ?? 0,
    sending: counts.sending ?? 0,
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0,
    retry_scheduled: counts.retry_scheduled ?? 0
  };
}
