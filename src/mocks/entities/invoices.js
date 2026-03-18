export const invoices = [
  {
    id: "inv-001",
    invoice_number: "INV-2026-0001",
    client_id: "c-001",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    due_date: "2026-04-07",
    currency: "NZD",
    subtotal: 280,
    tax_amount: 42,
    total: 322,
    balance_due: 322,
    status: "issued",
    communication_status: "queued",
    line_items: [
      {
        id: "invli-001",
        source_type: "visit",
        source_id: "v-001",
        description: "Regular clean service 2026-03-16",
        amount: 140
      },
      {
        id: "invli-002",
        source_type: "visit",
        source_id: "v-010",
        description: "Regular clean service 2026-03-19",
        amount: 140
      }
    ],
    export_ref: {
      format: "pdf",
      path: "/invoices/INV-2026-0001.pdf",
      generated_at: "2026-03-19T00:05:00.000Z"
    },
    last_error: null,
    issued_at: "2026-03-19T00:05:00.000Z",
    paid_at: null,
    created_at: "2026-03-19T00:01:00.000Z",
    updated_at: "2026-03-19T00:05:00.000Z"
  },
  {
    id: "inv-002",
    invoice_number: null,
    client_id: "c-003",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    due_date: null,
    currency: "NZD",
    subtotal: 495,
    tax_amount: 74.25,
    total: 569.25,
    balance_due: 569.25,
    status: "draft",
    communication_status: "not_sent",
    line_items: [
      {
        id: "invli-003",
        source_type: "visit",
        source_id: "v-006",
        description: "Deep clean service 2026-03-17",
        amount: 250
      },
      {
        id: "invli-004",
        source_type: "visit",
        source_id: "v-012",
        description: "Deep clean service 2026-03-19",
        amount: 245
      }
    ],
    export_ref: null,
    last_error: null,
    issued_at: null,
    paid_at: null,
    created_at: "2026-03-19T00:12:00.000Z",
    updated_at: "2026-03-19T00:12:00.000Z"
  },
  {
    id: "inv-003",
    invoice_number: "INV-2026-0002",
    client_id: "c-005",
    period_start: "2026-02-01",
    period_end: "2026-02-29",
    due_date: "2026-03-08",
    currency: "NZD",
    subtotal: 390,
    tax_amount: 58.5,
    total: 448.5,
    balance_due: 0,
    status: "paid",
    communication_status: "sent",
    line_items: [
      {
        id: "invli-005",
        source_type: "visit",
        source_id: "v-004",
        description: "Office clean service 2026-03-17",
        amount: 195
      },
      {
        id: "invli-006",
        source_type: "visit",
        source_id: "v-015",
        description: "Office clean service 2026-03-20",
        amount: 195
      }
    ],
    export_ref: {
      format: "pdf",
      path: "/invoices/INV-2026-0002.pdf",
      generated_at: "2026-03-01T08:10:00.000Z"
    },
    last_error: null,
    issued_at: "2026-03-01T08:10:00.000Z",
    paid_at: "2026-03-05T01:20:00.000Z",
    created_at: "2026-03-01T08:01:00.000Z",
    updated_at: "2026-03-05T01:20:00.000Z"
  }
];

