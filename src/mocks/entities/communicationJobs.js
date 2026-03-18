export const communicationJobs = [
  {
    id: "cj-001",
    job_type: "reminder_email",
    channel: "email",
    status: "sent",
    client_id: "c-001",
    scheduled_visit_id: "v-010",
    reminder_id: "rm-003",
    invoice_id: null,
    attempt_count: 1,
    max_attempts: 3,
    next_attempt_at: null,
    last_attempt_at: "2026-03-18T18:00:10.000Z",
    sent_at: "2026-03-18T18:00:10.000Z",
    provider_ref: "mock-provider-cj001",
    error_message: null,
    payload: {
      to: "maria.carter@example.com",
      subject: "Cleaning reminder for tomorrow at 8:00am"
    },
    created_at: "2026-03-18T17:59:30.000Z",
    updated_at: "2026-03-18T18:00:10.000Z"
  },
  {
    id: "cj-002",
    job_type: "invoice_email",
    channel: "email",
    status: "queued",
    client_id: "c-001",
    scheduled_visit_id: null,
    reminder_id: null,
    invoice_id: "inv-001",
    attempt_count: 0,
    max_attempts: 3,
    next_attempt_at: "2026-03-19T00:10:00.000Z",
    last_attempt_at: null,
    sent_at: null,
    provider_ref: null,
    error_message: null,
    payload: {
      to: "maria.carter@example.com",
      subject: "Invoice INV-2026-0001 for cleaning services"
    },
    created_at: "2026-03-19T00:07:00.000Z",
    updated_at: "2026-03-19T00:07:00.000Z"
  },
  {
    id: "cj-003",
    job_type: "service_completion_email",
    channel: "email",
    status: "failed",
    client_id: "c-008",
    scheduled_visit_id: "v-009",
    reminder_id: null,
    invoice_id: null,
    attempt_count: 3,
    max_attempts: 3,
    next_attempt_at: null,
    last_attempt_at: "2026-03-18T14:10:00.000Z",
    sent_at: null,
    provider_ref: null,
    error_message: "Mailbox rejected message after repeated attempts.",
    payload: {
      to: "daniela.rios@example.com",
      subject: "Your cleaning service is complete"
    },
    created_at: "2026-03-18T14:05:00.000Z",
    updated_at: "2026-03-18T14:10:00.000Z"
  }
];

