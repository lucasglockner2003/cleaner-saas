export const reminders = [
  {
    id: "rm-001",
    client_id: "c-006",
    scheduled_visit_id: "v-011",
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: "2026-03-18T20:00:00.000Z",
    status: "queued",
    provider_ref: null,
    payload: {
      subject: "Cleaning reminder for tomorrow at 9:45am",
      message: "Hi Oliver, this is a reminder that your cleaning is scheduled for tomorrow at 9:45am."
    }
  },
  {
    id: "rm-002",
    client_id: "c-003",
    scheduled_visit_id: "v-012",
    channel: "email",
    template_key: "visit_reminder_basic",
    scheduled_at: "2026-03-18T21:30:00.000Z",
    status: "queued",
    provider_ref: null,
    payload: {
      subject: "Cleaning reminder for tomorrow at 11:20am",
      message: "Hi Anna, this is a reminder that your cleaning is scheduled for tomorrow at 11:20am."
    }
  }
];

