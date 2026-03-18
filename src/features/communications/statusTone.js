export function communicationStatusTone(status) {
  if (status === "sent" || status === "paid" || status === "uploaded") {
    return "success";
  }
  if (status === "queued" || status === "sending" || status === "retry_scheduled" || status === "issued") {
    return "warning";
  }
  if (status === "failed" || status === "cancelled" || status === "out") {
    return "danger";
  }
  if (status === "draft" || status === "not_sent" || status === "not_queued") {
    return "neutral";
  }
  return "muted";
}

export function humanizeJobType(jobType) {
  if (jobType === "reminder_email") {
    return "Reminder";
  }
  if (jobType === "invoice_email") {
    return "Invoice";
  }
  if (jobType === "service_completion_email") {
    return "Completion";
  }
  return jobType || "-";
}
