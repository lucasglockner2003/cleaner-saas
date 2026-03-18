import { buildNextId, cloneDatabase, findById, safeTrim } from "../helpers";

export const BOOKING_STATUS = {
  NEW: "new",
  REVIEWING: "reviewing",
  QUOTED: "quoted",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};

const STATUS_TRANSITIONS = {
  new: [BOOKING_STATUS.REVIEWING, BOOKING_STATUS.REJECTED],
  reviewing: [BOOKING_STATUS.QUOTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.REJECTED],
  quoted: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.REJECTED],
  approved: [BOOKING_STATUS.CANCELLED],
  rejected: [BOOKING_STATUS.REVIEWING],
  cancelled: [BOOKING_STATUS.REVIEWING]
};

function normalizeBookingPayload(payload = {}) {
  return {
    client_id: payload.client_id ?? null,
    portal_account_id: payload.portal_account_id ?? null,
    source: safeTrim(payload.source) || "public",
    requester_name: safeTrim(payload.requester_name),
    requester_email: safeTrim(payload.requester_email),
    requester_phone: safeTrim(payload.requester_phone),
    suburb: safeTrim(payload.suburb),
    address: safeTrim(payload.address),
    service_type_id: safeTrim(payload.service_type_id),
    preferred_date: safeTrim(payload.preferred_date),
    preferred_time_window: safeTrim(payload.preferred_time_window) || "Flexible",
    home_size: safeTrim(payload.home_size),
    service_scope: safeTrim(payload.service_scope),
    notes: safeTrim(payload.notes)
  };
}

function parseHomeComplexity(homeSize = "") {
  const normalized = homeSize.toLowerCase();
  const bedroomMatch = normalized.match(/(\d+)\s*bed/);
  const bathroomMatch = normalized.match(/(\d+)\s*bath/);
  const bedrooms = bedroomMatch ? Number(bedroomMatch[1]) : 2;
  const bathrooms = bathroomMatch ? Number(bathroomMatch[1]) : 1;

  const bedroomFactor = Math.max(0, bedrooms - 2) * 0.12;
  const bathroomFactor = Math.max(0, bathrooms - 1) * 0.08;
  return 1 + bedroomFactor + bathroomFactor;
}

function estimateBookingSummary(db, normalized) {
  const serviceType = findById(db.serviceTypes ?? [], normalized.service_type_id);
  const baseDuration = serviceType?.default_duration_min ?? 90;
  const basePrice = serviceType?.default_price ?? 130;
  const complexity = parseHomeComplexity(normalized.home_size);
  const scopeBonus =
    normalized.service_scope.toLowerCase().includes("oven") || normalized.service_scope.toLowerCase().includes("windows")
      ? 1.15
      : 1;

  const estimatedDuration = Math.round(baseDuration * complexity * scopeBonus);
  const estimatedPrice = Number((basePrice * complexity * scopeBonus).toFixed(2));
  const summary = `${serviceType?.name ?? "Cleaning"} booking request (${estimatedDuration} min estimated).`;

  return {
    estimatedDuration,
    estimatedPrice,
    summary
  };
}

export function validateBookingPayload(db, payload = {}, options = {}) {
  const { requireClientLink = false } = options;
  const normalized = normalizeBookingPayload(payload);
  const errors = {};

  if (!normalized.requester_name || normalized.requester_name.length < 3) {
    errors.requester_name = "Please provide a full name.";
  }

  if (!normalized.requester_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.requester_email)) {
    errors.requester_email = "A valid email is required.";
  }

  const phoneDigits = normalized.requester_phone.replace(/[^\d]/g, "");
  if (!normalized.requester_phone || phoneDigits.length < 8) {
    errors.requester_phone = "Please provide a valid phone number.";
  }

  if (!normalized.address || normalized.address.length < 8) {
    errors.address = "Address is required.";
  }

  if (!normalized.suburb) {
    errors.suburb = "Suburb is required.";
  }

  if (!normalized.service_type_id || !(db.serviceTypes ?? []).some((item) => item.id === normalized.service_type_id)) {
    errors.service_type_id = "Select a valid service type.";
  }

  if (!normalized.preferred_date) {
    errors.preferred_date = "Preferred date is required.";
  }

  if (normalized.preferred_date && normalized.preferred_date < new Date().toISOString().slice(0, 10)) {
    errors.preferred_date = "Preferred date cannot be in the past.";
  }

  if (requireClientLink && !normalized.client_id) {
    errors.client_id = "This booking must be linked to a portal client.";
  }

  if (normalized.client_id && !(db.clients ?? []).some((client) => client.id === normalized.client_id)) {
    errors.client_id = "Linked client could not be found.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

function enrichBooking(db, booking) {
  const client = findById(db.clients ?? [], booking.client_id);
  const serviceType = findById(db.serviceTypes ?? [], booking.service_type_id);

  return {
    ...booking,
    client_name: client?.full_name ?? "-",
    service_type_name: serviceType?.name ?? "-",
    is_portal_request: booking.source === "portal"
  };
}

export function listBookingRequests(db, filters = {}) {
  const { status = "all", source = "all", clientId = "all" } = filters;

  return (db.bookingRequests ?? [])
    .filter((item) => (status === "all" ? true : item.status === status))
    .filter((item) => (source === "all" ? true : item.source === source))
    .filter((item) => (clientId === "all" ? true : item.client_id === clientId))
    .map((item) => enrichBooking(db, item))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function createBookingRequest(db, payload, options = {}) {
  const mutable = cloneDatabase(db);
  if (!mutable.bookingRequests) {
    mutable.bookingRequests = [];
  }

  const validation = validateBookingPayload(mutable, payload, {
    requireClientLink: options.requireClientLink ?? false
  });

  if (!validation.isValid) {
    return {
      db,
      ok: false,
      errors: validation.errors,
      message: "Booking request validation failed."
    };
  }

  const nowIso = new Date().toISOString();
  const normalized = validation.normalized;
  const summary = estimateBookingSummary(mutable, normalized);

  const booking = {
    id: buildNextId(mutable.bookingRequests, "br-"),
    client_id: normalized.client_id,
    portal_account_id: normalized.portal_account_id,
    source: normalized.source,
    status: BOOKING_STATUS.NEW,
    requester_name: normalized.requester_name,
    requester_email: normalized.requester_email,
    requester_phone: normalized.requester_phone,
    suburb: normalized.suburb,
    address: normalized.address,
    service_type_id: normalized.service_type_id,
    preferred_date: normalized.preferred_date,
    preferred_time_window: normalized.preferred_time_window,
    home_size: normalized.home_size,
    service_scope: normalized.service_scope,
    notes: normalized.notes,
    estimated_duration_min: summary.estimatedDuration,
    estimated_price: summary.estimatedPrice,
    summary: summary.summary,
    reviewed_by: null,
    internal_notes: "",
    created_at: nowIso,
    updated_at: nowIso
  };

  mutable.bookingRequests.push(booking);

  return {
    db: mutable,
    ok: true,
    errors: {},
    message: "Booking request submitted.",
    booking
  };
}

export function updateBookingRequestStatus(db, bookingId, nextStatus, reviewerId = null, internalNotes = "") {
  const mutable = cloneDatabase(db);
  const index = (mutable.bookingRequests ?? []).findIndex((item) => item.id === bookingId);
  if (index < 0) {
    return {
      db,
      ok: false,
      message: "Booking request not found."
    };
  }

  const current = mutable.bookingRequests[index];
  const allowed = STATUS_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      db,
      ok: false,
      message: `Cannot move booking from ${current.status} to ${nextStatus}.`
    };
  }

  mutable.bookingRequests[index] = {
    ...current,
    status: nextStatus,
    reviewed_by: reviewerId ?? current.reviewed_by,
    internal_notes: safeTrim(internalNotes) || current.internal_notes,
    updated_at: new Date().toISOString()
  };

  return {
    db: mutable,
    ok: true,
    message: `Booking marked as ${nextStatus}.`
  };
}

export function getBookingPipelineSummary(db) {
  const rows = listBookingRequests(db);
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: rows.length,
    new: counts.new ?? 0,
    reviewing: counts.reviewing ?? 0,
    quoted: counts.quoted ?? 0,
    approved: counts.approved ?? 0,
    rejected: counts.rejected ?? 0,
    cancelled: counts.cancelled ?? 0
  };
}
