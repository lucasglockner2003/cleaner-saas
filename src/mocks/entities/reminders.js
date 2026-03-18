export const reminders = [
  {
    id: "rm-001",
    client_id: "c-006",
    scheduled_visit_id: "v-011",
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: "2026-03-18T20:00:00.000Z",
    status: "queued",
    attempt_count: 0,
    max_attempts: 3,
    next_attempt_at: "2026-03-18T20:00:00.000Z",
    last_attempt_at: null,
    sent_at: null,
    provider_ref: null,
    error_message: null,
    payload: {
      to: "oliver.brooks@example.com",
      subject: "Cleaning reminder for tomorrow at 9:45am",
      body: "Hi Oliver, this is a reminder that your cleaning is scheduled for tomorrow at 9:45am.",
      metadata: {
        template_version: 1
      }
    },
    created_at: "2026-03-18T09:00:00.000Z",
    updated_at: "2026-03-18T09:00:00.000Z"
  },
  {
    id: "rm-002",
    client_id: "c-003",
    scheduled_visit_id: "v-012",
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: "2026-03-18T21:30:00.000Z",
    status: "retry_scheduled",
    attempt_count: 1,
    max_attempts: 3,
    next_attempt_at: "2026-03-19T00:15:00.000Z",
    last_attempt_at: "2026-03-18T21:31:00.000Z",
    sent_at: null,
    provider_ref: null,
    error_message: "Temporary transport timeout.",
    payload: {
      to: "anna.lee@example.com",
      subject: "Cleaning reminder for tomorrow at 11:20am",
      body: "Hi Anna, this is a reminder that your cleaning is scheduled for tomorrow at 11:20am.",
      metadata: {
        template_version: 1
      }
    },
    created_at: "2026-03-18T09:20:00.000Z",
    updated_at: "2026-03-18T21:31:00.000Z"
  },
  {
    id: "rm-003",
    client_id: "c-001",
    scheduled_visit_id: "v-010",
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: "2026-03-18T18:00:00.000Z",
    status: "sent",
    attempt_count: 1,
    max_attempts: 3,
    next_attempt_at: null,
    last_attempt_at: "2026-03-18T18:00:10.000Z",
    sent_at: "2026-03-18T18:00:10.000Z",
    provider_ref: "mock-provider-rm003",
    error_message: null,
    payload: {
      to: "maria.carter@example.com",
      subject: "Cleaning reminder for tomorrow at 8:00am",
      body: "Hi Maria, this is a reminder that your cleaning is scheduled for tomorrow at 8:00am.",
      metadata: {
        template_version: 1
      }
    },
    created_at: "2026-03-18T07:10:00.000Z",
    updated_at: "2026-03-18T18:00:10.000Z"
  }
];

