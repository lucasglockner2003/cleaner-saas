import { findById, safeTrim } from "../helpers";
import { listBookingRequests } from "../bookings/bookingsService";
import { listInvoices } from "../invoices/invoicesService";
import { listPayments } from "../payments/paymentsService";
import { listRecurringPreferences, projectAllRecurringServices } from "../recurring/recurringScheduleService";
import { getClientSubscriptionSnapshot } from "../subscriptions/subscriptionsService";

function getServiceTypeName(db, serviceTypeId) {
  return findById(db.serviceTypes ?? [], serviceTypeId)?.name ?? "-";
}

function resolvePortalAccount(db, user) {
  if (!user || user.user_type !== "customer") {
    return null;
  }

  const portalAccounts = db.portalAccounts ?? [];
  const byId = user.portal_account_id ? portalAccounts.find((item) => item.id === user.portal_account_id) : null;
  const byEmail = portalAccounts.find((item) => item.email.toLowerCase() === String(user.email || "").toLowerCase());
  const account = byId ?? byEmail ?? null;

  if (!account || account.status !== "active") {
    return null;
  }

  const client = findById(db.clients ?? [], account.client_id);
  if (!client) {
    return null;
  }

  return {
    ...account,
    client
  };
}

function enrichVisitForPortal(db, visit) {
  const log = (db.visitLogs ?? []).find((item) => item.scheduled_visit_id === visit.id);
  const team = findById(db.teams ?? [], visit.team_id);
  const employee = findById(db.employees ?? [], visit.employee_id);
  const photos = (db.visitPhotos ?? []).filter((item) => item.scheduled_visit_id === visit.id);
  const invoice = (db.invoices ?? [])
    .filter((item) => item.client_id === visit.client_id && item.period_start.slice(0, 7) === visit.date.slice(0, 7))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  return {
    id: visit.id,
    date: visit.date,
    status: visit.status,
    service_type_name: getServiceTypeName(db, visit.service_type_id),
    estimated_start: visit.estimated_start,
    estimated_end: visit.estimated_end,
    estimated_duration_min: visit.estimated_duration_min,
    actual_start: log?.actual_start ?? null,
    actual_finish: log?.actual_finish ?? null,
    actual_duration_min: log?.actual_duration_min ?? null,
    notes: safeTrim(log?.notes),
    team_name: team?.name ?? "-",
    cleaner_name: employee?.full_name ?? "Assigned later",
    invoice_id: invoice?.id ?? null,
    invoice_number: invoice?.invoice_number ?? null,
    proof: {
      before: photos
        .filter((photo) => photo.phase === "before")
        .map((photo) => ({
          id: photo.id,
          file_name: photo.file_name,
          url: photo.public_url ?? photo.storage_path,
          upload_status: photo.upload_status
        })),
      after: photos
        .filter((photo) => photo.phase === "after")
        .map((photo) => ({
          id: photo.id,
          file_name: photo.file_name,
          url: photo.public_url ?? photo.storage_path,
          upload_status: photo.upload_status
        }))
    }
  };
}

export function getCustomerPortalSnapshot(db, user) {
  const account = resolvePortalAccount(db, user);
  if (!account) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const visits = (db.scheduledVisits ?? [])
    .filter((visit) => visit.client_id === account.client_id)
    .map((visit) => enrichVisitForPortal(db, visit))
    .sort((a, b) => `${a.date}-${a.estimated_start}`.localeCompare(`${b.date}-${b.estimated_start}`));

  const upcomingVisits = visits.filter(
    (visit) => visit.date >= today && (visit.status === "scheduled" || visit.status === "in_progress")
  );
  const pastVisits = visits
    .filter((visit) => visit.date < today || visit.status === "completed" || visit.status === "cancelled")
    .sort((a, b) => `${b.date}-${b.estimated_start}`.localeCompare(`${a.date}-${a.estimated_start}`));

  const invoices = listInvoices(db, {
    clientId: account.client_id
  }).map((invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number ?? invoice.id,
    status: invoice.status,
    communication_status: invoice.communication_status,
    period_start: invoice.period_start,
    period_end: invoice.period_end,
    due_date: invoice.due_date,
    total: invoice.total,
    balance_due: invoice.balance_due,
    captured_amount: invoice.captured_amount ?? 0,
    pending_payment_amount: invoice.pending_payment_amount ?? 0,
    latest_payment_status: invoice.latest_payment_status ?? "none",
    latest_payment_ref: invoice.latest_payment_ref ?? null
  }));
  const payments = listPayments(db, {
    clientId: account.client_id
  }).map((payment) => ({
    id: payment.id,
    invoice_id: payment.invoice_id,
    invoice_number: payment.invoice_number,
    amount: payment.amount,
    status: payment.status,
    method_type: payment.method_type,
    provider: payment.provider,
    provider_ref: payment.provider_ref,
    created_at: payment.created_at,
    captured_at: payment.captured_at
  }));
  const subscription = getClientSubscriptionSnapshot(db, account.client_id);

  const recurringServices = listRecurringPreferences(db, {
    clientId: account.client_id
  });
  const recurringProjections = projectAllRecurringServices(db, {
    fromDate: today,
    horizonDays: 90,
    maxOccurrences: 30
  }).filter((item) => item.client_id === account.client_id);

  const bookingRequests = listBookingRequests(db, {
    clientId: account.client_id
  });

  const profile = {
    client_id: account.client.id,
    full_name: account.client.full_name,
    email: account.email,
    phone: account.client.phone,
    suburb: account.client.suburb,
    address: account.client.address,
    service_type_name: getServiceTypeName(db, account.client.service_type_id),
    cleaning_frequency: account.client.cleaning_frequency,
    special_instructions: account.client.special_instructions,
    notes_summary: account.client.notes_summary
  };

  return {
    account: {
      id: account.id,
      status: account.status,
      email: account.email,
      full_name: account.full_name,
      last_login_at: account.last_login_at
    },
    profile,
    upcomingVisits,
    pastVisits,
    invoices,
    payments,
    subscription,
    recurringServices,
    recurringProjections,
    bookingRequests,
    serviceCatalog: (db.serviceTypes ?? [])
      .filter((item) => item.active)
      .map((item) => ({
        id: item.id,
        name: item.name,
        default_duration_min: item.default_duration_min,
        default_price: item.default_price
      })),
    metrics: {
      upcomingCount: upcomingVisits.length,
      completedCount: pastVisits.filter((item) => item.status === "completed").length,
      openInvoiceCount: invoices.filter((item) => item.status === "issued" && item.balance_due > 0).length,
      proofReadyVisits: pastVisits.filter((item) => item.proof.before.length + item.proof.after.length > 0).length,
      activePlan: subscription.active?.plan_name ?? "No active plan",
      outstandingBalance: invoices.reduce((total, invoice) => total + (invoice.balance_due ?? 0), 0),
      paidTotal: payments
        .filter((payment) => payment.status === "captured")
        .reduce((total, payment) => total + (payment.amount ?? 0), 0)
    }
  };
}

export function canAccessClientData(user, clientId) {
  if (!user || user.user_type !== "customer") {
    return false;
  }

  if (user.client_id) {
    return user.client_id === clientId;
  }

  return false;
}
