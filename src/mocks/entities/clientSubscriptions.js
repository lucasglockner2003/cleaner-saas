export const clientSubscriptions = [
  {
    id: "cs-001",
    client_id: "c-001",
    plan_id: "sp-basic-weekly",
    status: "active",
    start_date: "2026-02-12",
    end_date: null,
    next_billing_date: "2026-03-26",
    billing_anchor_day: "Thursday",
    auto_renew: true,
    payment_provider: "manual",
    payment_method_hint: "bank_transfer",
    last_invoice_id: "inv-001",
    metadata: {
      preferred_window: "morning"
    },
    created_at: "2026-02-12T05:00:00.000Z",
    updated_at: "2026-03-19T00:05:00.000Z"
  },
  {
    id: "cs-002",
    client_id: "c-006",
    plan_id: "sp-fortnightly",
    status: "active",
    start_date: "2026-02-20",
    end_date: null,
    next_billing_date: "2026-03-27",
    billing_anchor_day: "Friday",
    auto_renew: true,
    payment_provider: "stripe",
    payment_method_hint: "card",
    last_invoice_id: null,
    metadata: {
      preferred_window: "midday"
    },
    created_at: "2026-02-20T04:10:00.000Z",
    updated_at: "2026-03-18T22:00:00.000Z"
  },
  {
    id: "cs-003",
    client_id: "c-003",
    plan_id: "sp-monthly-deep",
    status: "paused",
    start_date: "2026-01-15",
    end_date: null,
    next_billing_date: "2026-04-15",
    billing_anchor_day: "15",
    auto_renew: true,
    payment_provider: "manual",
    payment_method_hint: "bank_transfer",
    last_invoice_id: "inv-002",
    metadata: {
      pause_reason: "Client requested temporary hold during travel."
    },
    created_at: "2026-01-15T03:35:00.000Z",
    updated_at: "2026-03-12T01:15:00.000Z"
  }
];

