/**
 * Future invoice module. Keeps interface stable so UI and operations flows
 * do not need to change when a real billing backend is introduced.
 */

export function listInvoices(db) {
  return db.invoices;
}

export function buildMonthlyInvoiceDraft({ clientId, periodStart, periodEnd, lineItems = [] }) {
  const subtotal = lineItems.reduce((total, item) => total + item.amount, 0);
  return {
    client_id: clientId,
    period_start: periodStart,
    period_end: periodEnd,
    total: subtotal,
    status: "draft",
    issued_at: null,
    line_items: lineItems
  };
}

