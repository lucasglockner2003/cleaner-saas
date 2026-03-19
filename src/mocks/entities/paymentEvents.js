export const paymentEvents = [
  {
    id: "pev-001",
    provider: "stripe",
    provider_event_id: "evt_demo_001",
    event_type: "payment_intent.succeeded",
    payment_id: "pay-001",
    invoice_id: "inv-003",
    processing_status: "processed",
    processing_message: "Seed reconciliation event processed.",
    payload: {
      provider_intent_id: "pi_seed_001"
    },
    created_at: "2026-03-05T01:21:00.000Z"
  }
];
