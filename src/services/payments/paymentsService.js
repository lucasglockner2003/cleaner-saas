import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";
import {
  getPaymentProviderAdapter as resolvePaymentProviderAdapter,
  getPaymentProviderLaunchChecks as resolvePaymentProviderLaunchChecks,
  getPaymentProviderStatus as listPaymentProviderStatus
} from "./paymentProviderAdapterService";

export const PAYMENT_STATUS = {
  PENDING: "pending",
  CAPTURED: "captured",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled"
};

export const PAYMENT_METHOD = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  CASH: "cash",
  PORTAL_LINK: "portal_link",
  DIRECT_DEBIT: "direct_debit"
};

export const PAYMENT_PROVIDER = {
  MANUAL: "manual",
  STRIPE: "stripe",
  PAYPAL: "paypal",
  SUBSCRIPTION_BILLING: "subscription_billing"
};

const STATUS_TRANSITIONS = {
  pending: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
  failed: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED],
  cancelled: [PAYMENT_STATUS.PENDING],
  captured: [PAYMENT_STATUS.REFUNDED],
  refunded: []
};

const PROVIDER_EVENT_TO_STATUS = {
  "payment_intent.succeeded": PAYMENT_STATUS.CAPTURED,
  "charge.succeeded": PAYMENT_STATUS.CAPTURED,
  "payment_intent.payment_failed": PAYMENT_STATUS.FAILED,
  "charge.failed": PAYMENT_STATUS.FAILED,
  "charge.refunded": PAYMENT_STATUS.REFUNDED
};

function normalizeCurrency(value) {
  return Number(Number(value || 0).toFixed(2));
}

function buildIdempotencyKey(payload = {}) {
  const invoiceId = safeTrim(payload.invoice_id) || "invoice";
  const amount = normalizeCurrency(payload.amount ?? 0);
  const provider = safeTrim(payload.provider).toLowerCase() || PAYMENT_PROVIDER.MANUAL;
  const method = safeTrim(payload.method_type).toLowerCase() || PAYMENT_METHOD.BANK_TRANSFER;
  const nonce = safeTrim(payload.idempotency_nonce) || `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return `${provider}-${invoiceId}-${method}-${amount.toFixed(2)}-${nonce}`;
}

function ensurePaymentCollections(mutable) {
  if (!mutable.payments) {
    mutable.payments = [];
  }
  if (!mutable.paymentEvents) {
    mutable.paymentEvents = [];
  }
}

function normalizePaymentPayload(payload = {}) {
  const provider = safeTrim(payload.provider).toLowerCase() || PAYMENT_PROVIDER.MANUAL;
  const status = safeTrim(payload.status).toLowerCase() || PAYMENT_STATUS.PENDING;
  const idempotencyKey = safeTrim(payload.idempotency_key) || buildIdempotencyKey(payload);

  return {
    invoice_id: safeTrim(payload.invoice_id),
    client_id: safeTrim(payload.client_id) || null,
    amount: normalizeCurrency(payload.amount),
    currency: safeTrim(payload.currency) || "NZD",
    status,
    method_type: safeTrim(payload.method_type).toLowerCase() || PAYMENT_METHOD.BANK_TRANSFER,
    provider,
    provider_intent_id: safeTrim(payload.provider_intent_id) || null,
    provider_ref: safeTrim(payload.provider_ref) || null,
    provider_event_id: safeTrim(payload.provider_event_id) || null,
    idempotency_key: idempotencyKey,
    failure_code: safeTrim(payload.failure_code) || null,
    failure_reason: safeTrim(payload.failure_reason) || null,
    reconciliation_status:
      provider === PAYMENT_PROVIDER.MANUAL
        ? "not_required"
        : status === PAYMENT_STATUS.PENDING
          ? "pending"
          : "succeeded",
    provider_last_error: safeTrim(payload.provider_last_error) || null,
    notes: safeTrim(payload.notes) || ""
  };
}

function assertValidPaymentStatus(status) {
  return Object.values(PAYMENT_STATUS).includes(status);
}

function assertValidPaymentMethod(methodType) {
  return Object.values(PAYMENT_METHOD).includes(methodType);
}

function assertValidProvider(provider) {
  return Object.values(PAYMENT_PROVIDER).includes(provider);
}

function appendPaymentEvent(mutable, payload = {}) {
  if (!payload.provider_event_id) {
    return null;
  }

  const duplicate = (mutable.paymentEvents ?? []).find((event) => event.provider_event_id === payload.provider_event_id);
  if (duplicate) {
    return duplicate;
  }

  const nowIso = new Date().toISOString();
  const record = {
    id: buildNextId(mutable.paymentEvents ?? [], "pev-"),
    organization_id: appEnv.organizationId,
    provider: payload.provider || PAYMENT_PROVIDER.MANUAL,
    provider_event_id: payload.provider_event_id,
    event_type: payload.event_type || "unknown",
    payment_id: payload.payment_id ?? null,
    invoice_id: payload.invoice_id ?? null,
    processing_status: payload.processing_status || "processed",
    processing_message: payload.processing_message || "",
    payload: payload.payload ?? {},
    created_at: nowIso
  };

  mutable.paymentEvents.push(record);
  return record;
}

function applyCapturedAmountToInvoice(mutable, invoiceId, amount) {
  const invoiceIndex = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (invoiceIndex < 0) {
    return;
  }

  const invoice = mutable.invoices[invoiceIndex];
  const nextBalance = normalizeCurrency(Math.max(0, (invoice.balance_due ?? invoice.total ?? 0) - amount));
  mutable.invoices[invoiceIndex] = {
    ...invoice,
    balance_due: nextBalance,
    status: nextBalance <= 0 ? "paid" : "issued",
    paid_at: nextBalance <= 0 ? new Date().toISOString() : invoice.paid_at,
    updated_at: new Date().toISOString()
  };
}

function applyRefundAmountToInvoice(mutable, invoiceId, amount) {
  const invoiceIndex = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (invoiceIndex < 0) {
    return;
  }

  const invoice = mutable.invoices[invoiceIndex];
  const nextBalance = normalizeCurrency((invoice.balance_due ?? invoice.total ?? 0) + amount);
  mutable.invoices[invoiceIndex] = {
    ...invoice,
    balance_due: nextBalance,
    status: "issued",
    paid_at: null,
    updated_at: new Date().toISOString()
  };
}

function enrichPayment(db, payment) {
  const invoice = findById(db.invoices ?? [], payment.invoice_id);
  const client = findById(db.clients ?? [], payment.client_id || invoice?.client_id);

  return {
    ...payment,
    invoice_number: invoice?.invoice_number ?? payment.invoice_id,
    invoice_status: invoice?.status ?? "-",
    invoice_balance_due: invoice?.balance_due ?? 0,
    client_name: client?.full_name ?? "-",
    is_provider_backed: [PAYMENT_PROVIDER.STRIPE, PAYMENT_PROVIDER.PAYPAL, PAYMENT_PROVIDER.SUBSCRIPTION_BILLING].includes(
      payment.provider
    )
  };
}

export function listPayments(db, filters = {}) {
  const { status = "all", clientId = "all", invoiceId = "all", month = "all" } = filters;
  return (db.payments ?? [])
    .map((payment) => enrichPayment(db, payment))
    .filter((payment) => (status === "all" ? true : payment.status === status))
    .filter((payment) => (clientId === "all" ? true : payment.client_id === clientId))
    .filter((payment) => (invoiceId === "all" ? true : payment.invoice_id === invoiceId))
    .filter((payment) =>
      month === "all" ? true : String(payment.created_at || payment.captured_at || "").startsWith(month)
    )
    .sort((a, b) => (b.captured_at || b.created_at).localeCompare(a.captured_at || a.created_at));
}

export function listPaymentEvents(db, filters = {}) {
  const { provider = "all", paymentId = "all", status = "all" } = filters;
  return (db.paymentEvents ?? [])
    .filter((event) => (provider === "all" ? true : event.provider === provider))
    .filter((event) => (paymentId === "all" ? true : event.payment_id === paymentId))
    .filter((event) => (status === "all" ? true : event.processing_status === status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createPaymentRecord(db, payload = {}) {
  const mutable = cloneDatabase(db);
  ensurePaymentCollections(mutable);

  const normalized = normalizePaymentPayload(payload);
  const errors = {};

  if (!normalized.invoice_id) {
    errors.invoice_id = "Invoice is required for payment records.";
  }

  const invoice = findById(mutable.invoices ?? [], normalized.invoice_id);
  if (!invoice) {
    errors.invoice_id = "Invoice not found.";
  }

  if (Number.isNaN(normalized.amount) || normalized.amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  const balanceDue = invoice?.balance_due ?? invoice?.total ?? 0;
  if (normalized.amount > balanceDue + 0.01) {
    errors.amount = "Amount exceeds remaining invoice balance.";
  }

  if (!assertValidPaymentStatus(normalized.status)) {
    errors.status = "Invalid payment status.";
  }

  if (!assertValidPaymentMethod(normalized.method_type)) {
    errors.method_type = "Invalid payment method.";
  }

  if (!assertValidProvider(normalized.provider)) {
    errors.provider = "Invalid payment provider.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      db,
      ok: false,
      errors,
      message: "Payment validation failed."
    };
  }

  const duplicateIdempotency = mutable.payments.find(
    (item) =>
      item.idempotency_key &&
      item.idempotency_key === normalized.idempotency_key &&
      item.provider === normalized.provider &&
      item.invoice_id === normalized.invoice_id
  );

  if (duplicateIdempotency) {
    return {
      db,
      ok: true,
      errors: {},
      message: "Duplicate payment request ignored by idempotency key.",
      payment: duplicateIdempotency,
      idempotentReplay: true
    };
  }

  const nowIso = new Date().toISOString();
  const payment = {
    id: buildNextId(mutable.payments, "pay-"),
    organization_id: appEnv.organizationId,
    invoice_id: normalized.invoice_id,
    client_id: normalized.client_id || invoice.client_id,
    amount: normalized.amount,
    currency: normalized.currency,
    status: normalized.status,
    method_type: normalized.method_type,
    provider: normalized.provider,
    provider_intent_id: normalized.provider_intent_id,
    provider_ref: normalized.provider_ref,
    provider_event_id: normalized.provider_event_id,
    idempotency_key: normalized.idempotency_key,
    failure_code: normalized.failure_code,
    failure_reason: normalized.failure_reason,
    reconciliation_status: normalized.reconciliation_status,
    provider_last_error: normalized.provider_last_error,
    last_reconciled_at: normalized.status !== PAYMENT_STATUS.PENDING ? nowIso : null,
    refunded_amount: 0,
    captured_at: normalized.status === PAYMENT_STATUS.CAPTURED ? nowIso : null,
    created_at: nowIso,
    updated_at: nowIso,
    notes: normalized.notes
  };

  mutable.payments.push(payment);

  if (payment.status === PAYMENT_STATUS.CAPTURED) {
    applyCapturedAmountToInvoice(mutable, payment.invoice_id, payment.amount);
  }

  if (payment.provider_event_id) {
    appendPaymentEvent(mutable, {
      provider: payment.provider,
      provider_event_id: payment.provider_event_id,
      event_type: "payment.created",
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      processing_status: "processed",
      processing_message: "Provider-linked payment record created.",
      payload: {
        provider_intent_id: payment.provider_intent_id,
        provider_ref: payment.provider_ref
      }
    });
  }

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: `Payment ${payment.status} recorded.`,
    payment
  };
}

export function updatePaymentStatus(db, paymentId, nextStatus, options = {}) {
  const mutable = cloneDatabase(db);
  ensurePaymentCollections(mutable);
  const paymentIndex = (mutable.payments ?? []).findIndex((payment) => payment.id === paymentId);
  if (paymentIndex < 0) {
    return {
      db,
      ok: false,
      message: "Payment not found."
    };
  }

  if (!assertValidPaymentStatus(nextStatus)) {
    return {
      db,
      ok: false,
      message: "Invalid payment status."
    };
  }

  const current = mutable.payments[paymentIndex];
  if (current.status === nextStatus) {
    if (options.provider_event_id) {
      appendPaymentEvent(mutable, {
        provider: current.provider,
        provider_event_id: options.provider_event_id,
        event_type: options.event_type || "provider.event",
        payment_id: current.id,
        invoice_id: current.invoice_id,
        processing_status: "idempotent_replay",
        processing_message: `Event replay ignored; payment already in ${nextStatus}.`,
        payload: options.raw_payload ?? {}
      });
    }

    return {
      db: mutable,
      ok: true,
      message: `Payment already ${nextStatus}.`,
      payment: current,
      idempotentReplay: true
    };
  }

  const allowed = STATUS_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      db,
      ok: false,
      message: `Cannot move payment from ${current.status} to ${nextStatus}.`
    };
  }

  const nowIso = new Date().toISOString();
  const failureReason = safeTrim(options.failure_reason);
  const refundAmount = normalizeCurrency(options.refund_amount ?? current.amount - (current.refunded_amount ?? 0));

  let updatedPayment = {
    ...current,
    status: nextStatus,
    provider_ref: safeTrim(options.provider_ref) || current.provider_ref,
    provider_intent_id: safeTrim(options.provider_intent_id) || current.provider_intent_id,
    provider_event_id: safeTrim(options.provider_event_id) || current.provider_event_id,
    provider_last_error: null,
    updated_at: nowIso
  };

  if (nextStatus === PAYMENT_STATUS.CAPTURED) {
    updatedPayment = {
      ...updatedPayment,
      captured_at: current.captured_at ?? nowIso,
      failure_code: null,
      failure_reason: null,
      reconciliation_status: current.provider === PAYMENT_PROVIDER.MANUAL ? "not_required" : "succeeded",
      last_reconciled_at: nowIso
    };
    applyCapturedAmountToInvoice(mutable, current.invoice_id, current.amount);
  }

  if (nextStatus === PAYMENT_STATUS.FAILED) {
    updatedPayment = {
      ...updatedPayment,
      failure_reason: failureReason || "Payment failed during capture.",
      provider_last_error: failureReason || "Payment failed during capture.",
      reconciliation_status: current.provider === PAYMENT_PROVIDER.MANUAL ? "not_required" : "failed",
      last_reconciled_at: nowIso
    };
  }

  if (nextStatus === PAYMENT_STATUS.REFUNDED) {
    if (Number.isNaN(refundAmount) || refundAmount <= 0) {
      return {
        db,
        ok: false,
        message: "Refund amount must be greater than zero."
      };
    }

    if (refundAmount > current.amount - (current.refunded_amount ?? 0) + 0.01) {
      return {
        db,
        ok: false,
        message: "Refund amount exceeds refundable balance."
      };
    }

    updatedPayment = {
      ...updatedPayment,
      refunded_amount: normalizeCurrency((current.refunded_amount ?? 0) + refundAmount),
      notes: safeTrim(options.notes) || current.notes,
      reconciliation_status: current.provider === PAYMENT_PROVIDER.MANUAL ? "not_required" : "succeeded",
      last_reconciled_at: nowIso
    };
    applyRefundAmountToInvoice(mutable, current.invoice_id, refundAmount);
  }

  mutable.payments[paymentIndex] = updatedPayment;

  if (options.provider_event_id) {
    appendPaymentEvent(mutable, {
      provider: updatedPayment.provider,
      provider_event_id: options.provider_event_id,
      event_type: options.event_type || "provider.event",
      payment_id: updatedPayment.id,
      invoice_id: updatedPayment.invoice_id,
      processing_status: "processed",
      processing_message: `Payment transitioned to ${nextStatus}.`,
      payload: options.raw_payload ?? {}
    });
  }

  return {
    db: mutable,
    ok: true,
    message: `Payment marked as ${nextStatus}.`,
    payment: updatedPayment
  };
}

export function getPaymentsSummary(db, options = {}) {
  const month = options.month ?? "all";
  const rows = listPayments(db, { month });
  const capturedAmount = rows
    .filter((payment) => payment.status === PAYMENT_STATUS.CAPTURED)
    .reduce((total, payment) => total + payment.amount, 0);
  const pendingAmount = rows
    .filter((payment) => payment.status === PAYMENT_STATUS.PENDING)
    .reduce((total, payment) => total + payment.amount, 0);
  const refundedAmount = rows.reduce((total, payment) => total + (payment.refunded_amount ?? 0), 0);
  const failedCount = rows.filter((payment) => payment.status === PAYMENT_STATUS.FAILED).length;
  const cancelledCount = rows.filter((payment) => payment.status === PAYMENT_STATUS.CANCELLED).length;

  const invoiceRows = (db.invoices ?? []).filter((invoice) => (month === "all" ? true : invoice.period_start.startsWith(month)));
  const billedAmount = invoiceRows.reduce((total, invoice) => total + (invoice.total ?? 0), 0);
  const balanceDue = invoiceRows.reduce((total, invoice) => total + (invoice.balance_due ?? 0), 0);
  const collectionRate = billedAmount > 0 ? Number((((billedAmount - balanceDue) / billedAmount) * 100).toFixed(1)) : 0;

  const byMethod = rows.reduce((acc, payment) => {
    const method = payment.method_type || "unknown";
    acc[method] = normalizeCurrency((acc[method] ?? 0) + payment.amount);
    return acc;
  }, {});
  const byProvider = rows.reduce((acc, payment) => {
    const provider = payment.provider || "unknown";
    acc[provider] = normalizeCurrency((acc[provider] ?? 0) + payment.amount);
    return acc;
  }, {});

  return {
    totalTransactions: rows.length,
    capturedAmount: normalizeCurrency(capturedAmount),
    pendingAmount: normalizeCurrency(pendingAmount),
    refundedAmount: normalizeCurrency(refundedAmount),
    failedCount,
    cancelledCount,
    billedAmount: normalizeCurrency(billedAmount),
    balanceDue: normalizeCurrency(balanceDue),
    collectionRate,
    byMethod,
    byProvider
  };
}

export function getInvoicePaymentSnapshot(db, invoiceId) {
  const invoice = findById(db.invoices ?? [], invoiceId);
  if (!invoice) {
    return null;
  }

  const payments = listPayments(db, {
    invoiceId
  });
  const captured = payments
    .filter((payment) => payment.status === PAYMENT_STATUS.CAPTURED)
    .reduce((total, payment) => total + payment.amount, 0);
  const pending = payments
    .filter((payment) => payment.status === PAYMENT_STATUS.PENDING)
    .reduce((total, payment) => total + payment.amount, 0);
  const failed = payments.filter((payment) => payment.status === PAYMENT_STATUS.FAILED).length;
  const refunded = payments.reduce((total, payment) => total + (payment.refunded_amount ?? 0), 0);

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number ?? invoice.id,
    invoice_status: invoice.status,
    total: invoice.total ?? 0,
    balance_due: invoice.balance_due ?? 0,
    captured_amount: normalizeCurrency(captured),
    pending_amount: normalizeCurrency(pending),
    refunded_amount: normalizeCurrency(refunded),
    failed_attempts: failed,
    payments
  };
}

export function getPaymentProviderAdapter(provider) {
  return resolvePaymentProviderAdapter(provider);
}

export async function buildPaymentIntent(invoice, payload = {}) {
  if (!invoice) {
    return {
      ok: false,
      message: "Invoice is required."
    };
  }

  const adapter = getPaymentProviderAdapter(payload.provider || PAYMENT_PROVIDER.MANUAL);
  const idempotencyKey = safeTrim(payload.idempotency_key) || buildIdempotencyKey(payload);
  return adapter.createIntent(invoice, {
    ...payload,
    idempotency_key: idempotencyKey
  });
}

export function getPaymentProviderStatus() {
  return listPaymentProviderStatus();
}

export function getPaymentProviderLaunchChecks(provider) {
  return resolvePaymentProviderLaunchChecks(provider);
}

function mapProviderEventToStatus(eventPayload = {}) {
  const eventType = safeTrim(eventPayload.event_type || eventPayload.type).toLowerCase();
  const providerStatus = safeTrim(eventPayload.payment_status || eventPayload.status).toLowerCase();

  if (PROVIDER_EVENT_TO_STATUS[eventType]) {
    return PROVIDER_EVENT_TO_STATUS[eventType];
  }
  if (providerStatus === "succeeded" || providerStatus === "captured") {
    return PAYMENT_STATUS.CAPTURED;
  }
  if (providerStatus === "failed" || providerStatus === "requires_payment_method") {
    return PAYMENT_STATUS.FAILED;
  }
  if (providerStatus === "refunded") {
    return PAYMENT_STATUS.REFUNDED;
  }
  return null;
}

function findPaymentForProviderEvent(db, eventPayload = {}) {
  const paymentId = safeTrim(eventPayload.payment_id || eventPayload.metadata?.payment_id);
  const providerIntentId = safeTrim(eventPayload.provider_intent_id || eventPayload.data?.object?.id);
  const providerRef = safeTrim(eventPayload.provider_ref || eventPayload.charge_id);
  const idempotencyKey = safeTrim(eventPayload.idempotency_key);

  if (paymentId) {
    const direct = (db.payments ?? []).find((item) => item.id === paymentId);
    if (direct) {
      return direct;
    }
  }
  if (providerIntentId) {
    const byIntent = (db.payments ?? []).find((item) => item.provider_intent_id === providerIntentId);
    if (byIntent) {
      return byIntent;
    }
  }
  if (providerRef) {
    const byRef = (db.payments ?? []).find((item) => item.provider_ref === providerRef);
    if (byRef) {
      return byRef;
    }
  }
  if (idempotencyKey) {
    const byIdempotency = (db.payments ?? []).find((item) => item.idempotency_key === idempotencyKey);
    if (byIdempotency) {
      return byIdempotency;
    }
  }

  return null;
}

export async function preparePaymentIntent(db, payload = {}) {
  const mutable = cloneDatabase(db);
  ensurePaymentCollections(mutable);
  const normalized = normalizePaymentPayload({
    ...payload,
    status: PAYMENT_STATUS.PENDING
  });
  const launchChecks = getPaymentProviderLaunchChecks(normalized.provider);
  if (!launchChecks.isReady) {
    return {
      db,
      ok: false,
      message: `Provider ${normalized.provider} is not launch-ready.`,
      errors: {
        provider: launchChecks.checks
          .filter((item) => !item.ok)
          .map((item) => item.message)
          .join(" ")
      }
    };
  }
  const invoice = findById(mutable.invoices ?? [], normalized.invoice_id);

  if (!invoice) {
    return {
      db,
      ok: false,
      message: "Invoice not found.",
      errors: {
        invoice_id: "Invoice not found."
      }
    };
  }

  const intentResult = await buildPaymentIntent(invoice, normalized);
  if (!intentResult.ok) {
    return {
      db,
      ok: false,
      message: intentResult.message || "Provider intent preparation failed.",
      errors: {
        provider: intentResult.message || "Provider intent preparation failed."
      },
      intent: intentResult.intent ?? null
    };
  }

  const createResult = createPaymentRecord(mutable, {
    ...normalized,
    status: PAYMENT_STATUS.PENDING,
    provider_intent_id: intentResult.intent?.provider_intent_id ?? normalized.provider_intent_id,
    provider_ref: intentResult.intent?.provider_ref ?? normalized.provider_ref,
    idempotency_key: normalized.idempotency_key
  });

  if (!createResult.ok) {
    return createResult;
  }

  return {
    ...createResult,
    message: "Provider payment intent prepared and pending payment recorded.",
    intent: intentResult.intent
  };
}

export function applyPaymentProviderEvent(db, eventPayload = {}) {
  const mutable = cloneDatabase(db);
  ensurePaymentCollections(mutable);

  const providerEventId = safeTrim(eventPayload.provider_event_id || eventPayload.id);
  const provider = safeTrim(eventPayload.provider).toLowerCase() || appEnv.paymentProvider || PAYMENT_PROVIDER.STRIPE;
  const eventType = safeTrim(eventPayload.event_type || eventPayload.type).toLowerCase() || "provider.event";

  if (!providerEventId) {
    return {
      db,
      ok: false,
      message: "Provider event id is required for idempotent processing."
    };
  }

  const alreadyProcessed = (mutable.paymentEvents ?? []).find((event) => event.provider_event_id === providerEventId);
  if (alreadyProcessed) {
    return {
      db: mutable,
      ok: true,
      message: "Provider event already processed.",
      idempotentReplay: true
    };
  }

  const payment = findPaymentForProviderEvent(mutable, eventPayload);
  if (!payment) {
    appendPaymentEvent(mutable, {
      provider,
      provider_event_id: providerEventId,
      event_type: eventType,
      processing_status: "ignored_unmatched",
      processing_message: "No matching payment found for provider event.",
      payload: eventPayload
    });

    return {
      db: mutable,
      ok: true,
      message: "Provider event stored for review; matching payment not found."
    };
  }

  const nextStatus = mapProviderEventToStatus(eventPayload);
  if (!nextStatus) {
    appendPaymentEvent(mutable, {
      provider,
      provider_event_id: providerEventId,
      event_type: eventType,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      processing_status: "ignored",
      processing_message: "Provider event type does not map to payment transition.",
      payload: eventPayload
    });
    return {
      db: mutable,
      ok: true,
      message: "Provider event ignored (no status transition mapping)."
    };
  }

  const transition = updatePaymentStatus(mutable, payment.id, nextStatus, {
    provider_event_id: providerEventId,
    provider_ref: safeTrim(eventPayload.provider_ref || eventPayload.charge_id) || payment.provider_ref,
    provider_intent_id: safeTrim(eventPayload.provider_intent_id || eventPayload.data?.object?.id) || payment.provider_intent_id,
    failure_reason: safeTrim(eventPayload.failure_reason || eventPayload.last_payment_error?.message),
    event_type: eventType,
    raw_payload: eventPayload
  });

  if (!transition.ok) {
    const withEventDb = cloneDatabase(transition.db ?? mutable);
    ensurePaymentCollections(withEventDb);
    appendPaymentEvent(withEventDb, {
      provider,
      provider_event_id: providerEventId,
      event_type: eventType,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      processing_status: "rejected",
      processing_message: transition.message,
      payload: eventPayload
    });
    return {
      ...transition,
      db: withEventDb
    };
  }

  return {
    ...transition,
    message: `Provider event processed. Payment ${payment.id} moved to ${nextStatus}.`
  };
}

export async function runPaymentReconciliationCycle(db, options = {}) {
  const mutable = cloneDatabase(db);
  ensurePaymentCollections(mutable);
  const maxPayments = Number(options.maxPayments ?? 25);
  const providers = Array.isArray(options.providers) ? options.providers : Object.values(PAYMENT_PROVIDER);

  const pendingProviderPayments = (mutable.payments ?? [])
    .filter(
      (payment) =>
        payment.status === PAYMENT_STATUS.PENDING &&
        payment.provider !== PAYMENT_PROVIDER.MANUAL &&
        providers.includes(payment.provider)
    )
    .slice(0, maxPayments);

  let workingDb = mutable;
  let processed = 0;
  let advanced = 0;
  let failed = 0;
  let unchanged = 0;

  for (const payment of pendingProviderPayments) {
    const adapter = getPaymentProviderAdapter(payment.provider);
    // eslint-disable-next-line no-await-in-loop
    const reconcileResult = await adapter.reconcilePayment(payment);
    processed += 1;

    if (!reconcileResult.ok) {
      const withError = updatePaymentStatus(workingDb, payment.id, PAYMENT_STATUS.FAILED, {
        failure_reason: reconcileResult.error || "Provider reconciliation failed."
      });
      workingDb = withError.db;
      failed += 1;
      continue;
    }

    const mappedStatus = mapProviderEventToStatus({
      event_type: reconcileResult.event_type,
      payment_status: reconcileResult.payment_status
    });

    if (!mappedStatus || mappedStatus === PAYMENT_STATUS.PENDING) {
      unchanged += 1;
      continue;
    }

    const transitioned = updatePaymentStatus(workingDb, payment.id, mappedStatus, {
      provider_ref: reconcileResult.provider_ref ?? payment.provider_ref,
      provider_intent_id: reconcileResult.provider_intent_id ?? payment.provider_intent_id,
      provider_event_id: reconcileResult.provider_event_id ?? null,
      event_type: reconcileResult.event_type ?? "provider.reconcile",
      failure_reason: reconcileResult.error ?? null
    });
    workingDb = transitioned.db;
    if (transitioned.ok) {
      advanced += 1;
    } else {
      failed += 1;
    }
  }

  return {
    db: workingDb,
    ok: true,
    message: `Payment reconciliation processed ${processed} records. Advanced: ${advanced}, unchanged: ${unchanged}, failed: ${failed}.`,
    summary: {
      processed,
      advanced,
      unchanged,
      failed
    }
  };
}

export function getPaymentReconciliationStats(db) {
  const payments = db.payments ?? [];
  return {
    pendingProviderPayments: payments.filter(
      (item) => item.status === PAYMENT_STATUS.PENDING && item.provider !== PAYMENT_PROVIDER.MANUAL
    ).length,
    providerFailures: payments.filter(
      (item) => item.status === PAYMENT_STATUS.FAILED && item.provider !== PAYMENT_PROVIDER.MANUAL
    ).length,
    processedEvents: (db.paymentEvents ?? []).length,
    unmatchedEvents: (db.paymentEvents ?? []).filter((event) => event.processing_status === "ignored_unmatched").length,
    rejectedEvents: (db.paymentEvents ?? []).filter((event) => event.processing_status === "rejected").length
  };
}
