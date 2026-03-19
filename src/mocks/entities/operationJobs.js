export const operationJobs = [
  {
    id: "oj-001",
    job_type: "reminder_dispatch",
    status: "queued",
    priority: 8,
    scheduled_for: "2026-03-19T05:00:00.000Z",
    next_attempt_at: "2026-03-19T05:00:00.000Z",
    started_at: null,
    finished_at: null,
    worker_id: null,
    lock_expires_at: null,
    attempt_count: 0,
    max_attempts: 3,
    payload: {
      targetDate: "2026-03-19",
      maxJobs: 25
    },
    result_summary: null,
    error_message: null,
    created_by: "system",
    created_at: "2026-03-19T04:55:00.000Z",
    updated_at: "2026-03-19T04:55:00.000Z"
  },
  {
    id: "oj-002",
    job_type: "payment_reconciliation",
    status: "queued",
    priority: 10,
    scheduled_for: "2026-03-19T05:30:00.000Z",
    next_attempt_at: "2026-03-19T05:30:00.000Z",
    started_at: null,
    finished_at: null,
    worker_id: null,
    lock_expires_at: null,
    attempt_count: 0,
    max_attempts: 5,
    payload: {
      maxPayments: 20
    },
    result_summary: null,
    error_message: null,
    created_by: "system",
    created_at: "2026-03-19T05:20:00.000Z",
    updated_at: "2026-03-19T05:20:00.000Z"
  }
];
