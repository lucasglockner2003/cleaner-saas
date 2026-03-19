import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import {
  applyPaymentProviderEvent,
  createPaymentRecord,
  PAYMENT_STATUS
} from "./paymentsService";

describe("paymentsService lifecycle", () => {
  it("applies captured payments against invoice balance", () => {
    const db = createSeedDatabase();
    const result = createPaymentRecord(db, {
      invoice_id: "inv-001",
      amount: 100,
      provider: "manual",
      method_type: "bank_transfer",
      status: "captured"
    });

    expect(result.ok).toBe(true);
    const invoice = result.db.invoices.find((row) => row.id === "inv-001");
    expect(invoice.balance_due).toBe(222);
    expect(invoice.status).toBe("issued");
  });

  it("uses idempotency key to avoid duplicate payment creation", () => {
    const db = createSeedDatabase();
    const payload = {
      invoice_id: "inv-001",
      amount: 50,
      provider: "manual",
      method_type: "bank_transfer",
      status: "captured",
      idempotency_key: "idem-test-001"
    };

    const first = createPaymentRecord(db, payload);
    const second = createPaymentRecord(first.db, payload);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.idempotentReplay).toBe(true);
    const createdRows = second.db.payments.filter((row) => row.idempotency_key === "idem-test-001");
    expect(createdRows).toHaveLength(1);
  });

  it("processes provider webhook events idempotently", () => {
    const db = createSeedDatabase();
    const first = applyPaymentProviderEvent(db, {
      id: "evt_test_1001",
      provider: "stripe",
      event_type: "payment_intent.succeeded",
      provider_intent_id: "pi_demo_001"
    });

    expect(first.ok).toBe(true);
    const payment = first.db.payments.find((row) => row.provider_intent_id === "pi_demo_001");
    expect(payment.status).toBe(PAYMENT_STATUS.CAPTURED);

    const second = applyPaymentProviderEvent(first.db, {
      id: "evt_test_1001",
      provider: "stripe",
      event_type: "payment_intent.succeeded",
      provider_intent_id: "pi_demo_001"
    });

    expect(second.ok).toBe(true);
    expect(second.idempotentReplay).toBe(true);
  });
});
