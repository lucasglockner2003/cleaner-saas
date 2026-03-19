import { buildNextId, cloneDatabase, findById } from "../helpers";

const TAX_RATE = 0.15;

function formatInvoiceNumber(index, date = new Date()) {
  const year = date.getUTCFullYear();
  return `INV-${year}-${String(index).padStart(4, "0")}`;
}

function buildInvoiceExportRef(invoiceNumber) {
  const nowIso = new Date().toISOString();
  return {
    format: "pdf",
    path: `/invoices/${invoiceNumber}.pdf`,
    generated_at: nowIso
  };
}

function calculateTotals(lineItems = []) {
  const subtotal = lineItems.reduce((total, item) => total + (item.amount ?? 0), 0);
  const taxAmount = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  return {
    subtotal,
    taxAmount,
    total
  };
}

function enrichInvoice(db, invoice) {
  const client = findById(db.clients, invoice.client_id);
  const payments = (db.payments ?? []).filter((item) => item.invoice_id === invoice.id);
  const capturedAmount = payments
    .filter((item) => item.status === "captured")
    .reduce((total, item) => total + (item.amount ?? 0), 0);
  const pendingAmount = payments
    .filter((item) => item.status === "pending")
    .reduce((total, item) => total + (item.amount ?? 0), 0);
  const refundedAmount = payments.reduce((total, item) => total + (item.refunded_amount ?? 0), 0);
  const latestPayment = [...payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  return {
    ...invoice,
    client_name: client?.full_name ?? "-",
    client_email: client?.email ?? "",
    visit_count: invoice.line_items?.length ?? 0,
    is_overdue: invoice.status === "issued" && invoice.due_date ? invoice.due_date < new Date().toISOString().slice(0, 10) : false,
    captured_amount: Number(capturedAmount.toFixed(2)),
    pending_payment_amount: Number(pendingAmount.toFixed(2)),
    refunded_amount: Number(refundedAmount.toFixed(2)),
    latest_payment_status: latestPayment?.status ?? "none",
    latest_payment_ref: latestPayment?.provider_ref ?? latestPayment?.id ?? null
  };
}

export function listInvoices(db, filters = {}) {
  const { status = "all", clientId = "all" } = filters;

  return (db.invoices ?? [])
    .map((invoice) => enrichInvoice(db, invoice))
    .filter((invoice) => (status === "all" ? true : invoice.status === status))
    .filter((invoice) => (clientId === "all" ? true : invoice.client_id === clientId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function buildMonthlyInvoiceDraft({ clientId, periodStart, periodEnd, lineItems = [] }) {
  const totals = calculateTotals(lineItems);
  return {
    client_id: clientId,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: null,
    currency: "NZD",
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total: totals.total,
    balance_due: totals.total,
    status: "draft",
    communication_status: "not_sent",
    line_items: lineItems,
    export_ref: null,
    last_error: null,
    issued_at: null,
    paid_at: null
  };
}

function collectCompletedVisitsForInvoice(db, clientId, periodStart, periodEnd) {
  return db.scheduledVisits.filter((visit) => {
    return (
      visit.client_id === clientId &&
      visit.status === "completed" &&
      visit.date >= periodStart &&
      visit.date <= periodEnd
    );
  });
}

function buildLineItemsFromVisits(visits) {
  return visits.map((visit, index) => ({
    id: `invli-${visit.id}-${index + 1}`,
    source_type: "visit",
    source_id: visit.id,
    description: `Cleaning service ${visit.date} (${visit.estimated_duration_min} min est.)`,
    amount: visit.price ?? 0
  }));
}

export function generateInvoiceDraftsForPeriod(db, periodStart, periodEnd) {
  const mutable = cloneDatabase(db);
  const nowIso = new Date().toISOString();
  let created = 0;
  let updated = 0;

  const clientIds = [...new Set(mutable.scheduledVisits.map((visit) => visit.client_id))];
  clientIds.forEach((clientId) => {
    const visits = collectCompletedVisitsForInvoice(mutable, clientId, periodStart, periodEnd);
    if (!visits.length) {
      return;
    }

    const lineItems = buildLineItemsFromVisits(visits);
    const draftPayload = buildMonthlyInvoiceDraft({
      clientId,
      periodStart,
      periodEnd,
      lineItems
    });

    const existingIndex = mutable.invoices.findIndex(
      (invoice) =>
        invoice.client_id === clientId &&
        invoice.period_start === periodStart &&
        invoice.period_end === periodEnd &&
        invoice.status === "draft"
    );

    if (existingIndex >= 0) {
      mutable.invoices[existingIndex] = {
        ...mutable.invoices[existingIndex],
        ...draftPayload,
        updated_at: nowIso
      };
      updated += 1;
    } else {
      mutable.invoices.push({
        id: buildNextId(mutable.invoices, "inv-"),
        invoice_number: null,
        ...draftPayload,
        created_at: nowIso,
        updated_at: nowIso
      });
      created += 1;
    }
  });

  return {
    db: mutable,
    ok: true,
    message: `Invoice drafts generated. Created: ${created}, updated: ${updated}.`,
    summary: {
      created,
      updated
    }
  };
}

export function issueInvoice(db, invoiceId) {
  const mutable = cloneDatabase(db);
  const index = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Invoice not found."
    };
  }

  const invoice = mutable.invoices[index];
  const nowIso = new Date().toISOString();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoiceNumber = invoice.invoice_number || formatInvoiceNumber(mutable.invoices.length + 1, new Date(nowIso));

  mutable.invoices[index] = {
    ...invoice,
    invoice_number: invoiceNumber,
    status: "issued",
    communication_status: invoice.communication_status === "sent" ? "sent" : "queued",
    due_date: dueDate.toISOString().slice(0, 10),
    issued_at: nowIso,
    export_ref: buildInvoiceExportRef(invoiceNumber),
    updated_at: nowIso
  };

  return {
    db: mutable,
    ok: true,
    message: "Invoice issued."
  };
}

export function markInvoicePaid(db, invoiceId, paidAt = new Date().toISOString()) {
  const mutable = cloneDatabase(db);
  const index = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Invoice not found."
    };
  }

  mutable.invoices[index] = {
    ...mutable.invoices[index],
    status: "paid",
    balance_due: 0,
    paid_at: paidAt,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: "Invoice marked as paid."
  };
}

export function markInvoiceFailed(db, invoiceId, reason = "Invoice processing failed.") {
  const mutable = cloneDatabase(db);
  const index = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);

  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Invoice not found."
    };
  }

  mutable.invoices[index] = {
    ...mutable.invoices[index],
    status: "failed",
    last_error: reason,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: "Invoice marked as failed."
  };
}

export function setInvoiceCommunicationStatus(db, invoiceId, communicationStatus, reason = null) {
  const mutable = cloneDatabase(db);
  const index = mutable.invoices.findIndex((invoice) => invoice.id === invoiceId);
  if (index < 0) {
    return db;
  }

  mutable.invoices[index] = {
    ...mutable.invoices[index],
    communication_status: communicationStatus,
    last_error: reason,
    updated_at: new Date().toISOString()
  };

  return mutable;
}

export function getInvoiceStats(db) {
  const invoices = listInvoices(db);
  const payments = db.payments ?? [];
  const collectedAmount = payments
    .filter((payment) => payment.status === "captured")
    .reduce((total, payment) => total + (payment.amount ?? 0), 0);
  const pendingPaymentAmount = payments
    .filter((payment) => payment.status === "pending")
    .reduce((total, payment) => total + (payment.amount ?? 0), 0);
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.total += 1;
      acc[invoice.status] = (acc[invoice.status] ?? 0) + 1;
      acc.totalAmount += invoice.total ?? 0;
      acc.balanceDue += invoice.balance_due ?? 0;
      return acc;
    },
    {
      total: 0,
      totalAmount: 0,
      balanceDue: 0
    }
  );

  return {
    ...totals,
    draft: totals.draft ?? 0,
    issued: totals.issued ?? 0,
    paid: totals.paid ?? 0,
    failed: totals.failed ?? 0,
    collectedAmount: Number(collectedAmount.toFixed(2)),
    pendingPaymentAmount: Number(pendingPaymentAmount.toFixed(2))
  };
}

export function getInvoiceCommunicationStats(db) {
  const invoices = listInvoices(db);
  const counts = invoices.reduce((acc, invoice) => {
    const key = invoice.communication_status ?? "not_sent";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: invoices.length,
    not_sent: counts.not_sent ?? 0,
    queued: counts.queued ?? 0,
    retry_scheduled: counts.retry_scheduled ?? 0,
    sent: counts.sent ?? 0,
    failed: counts.failed ?? 0
  };
}

export function buildInvoiceEmailPayload(db, invoiceId) {
  const invoice = findById(db.invoices, invoiceId);
  if (!invoice) {
    return null;
  }

  const client = findById(db.clients, invoice.client_id);
  if (!client || !client.email) {
    return null;
  }

  return {
    to: client.email,
    subject: `Invoice ${invoice.invoice_number ?? invoice.id} for cleaning services`,
    body: [
      `Hi ${client.full_name.split(" ")[0]},`,
      "",
      `Your invoice ${invoice.invoice_number ?? invoice.id} for the period ${invoice.period_start} to ${invoice.period_end} is ready.`,
      `Total due: $${Number(invoice.balance_due ?? invoice.total ?? 0).toFixed(2)} ${invoice.currency ?? "NZD"}.`,
      invoice.due_date ? `Due date: ${invoice.due_date}` : "",
      "",
      "Thank you for choosing our cleaning services.",
      "Cleaner Ops Team"
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      invoice_id: invoice.id
    }
  };
}

export const invoicePersistenceAdapter = {
  async persistDraft(_draft) {
    return {
      ok: true
    };
  }
};
