import { buildNextId, cloneDatabase, findById, removeById, safeTrim } from "../helpers";
import { durationDelta } from "../../utils/scheduleEstimator";
import { parseTimeToMinutes } from "../../utils/dateTime";
import { appEnv } from "../../config/env";

const DEFAULT_CLIENT_DURATION = 90;
const ACQUISITION_SOURCES = ["google", "facebook", "website", "referral", "phone", "portal", "manual"];

function sanitizeClientPayload(payload) {
  return {
    full_name: safeTrim(payload.full_name),
    phone: safeTrim(payload.phone),
    email: safeTrim(payload.email),
    suburb: safeTrim(payload.suburb),
    address: safeTrim(payload.address),
    service_type_id: safeTrim(payload.service_type_id),
    cleaning_frequency: safeTrim(payload.cleaning_frequency),
    estimated_duration_min: Number(payload.estimated_duration_min ?? DEFAULT_CLIENT_DURATION),
    acquisition_source: safeTrim(payload.acquisition_source).toLowerCase() || "website",
    referral_source: safeTrim(payload.referral_source),
    notes_summary: safeTrim(payload.notes_summary),
    special_instructions: safeTrim(payload.special_instructions)
  };
}

function parseActualStartMinutes(actualStartIso) {
  if (!actualStartIso) {
    return null;
  }

  const date = new Date(actualStartIso);
  return date.getHours() * 60 + date.getMinutes();
}

function calculateLatenessMin(estimatedStart, actualStartIso) {
  const estimatedMinutes = parseTimeToMinutes(estimatedStart);
  const actualMinutes = parseActualStartMinutes(actualStartIso);

  if (actualMinutes == null) {
    return null;
  }

  return Math.max(0, actualMinutes - estimatedMinutes);
}

export function validateClientPayload(payload, db, options = {}) {
  const { mode = "create", clientId = null } = options;
  const normalized = sanitizeClientPayload(payload);
  const errors = {};

  if (!normalized.full_name || normalized.full_name.length < 3) {
    errors.full_name = "Full name must contain at least 3 characters.";
  }

  const phoneDigits = normalized.phone.replace(/[^\d]/g, "");
  if (!normalized.phone || phoneDigits.length < 8) {
    errors.phone = "Phone number must include at least 8 digits.";
  }

  if (!normalized.suburb) {
    errors.suburb = "Suburb is required for dispatch grouping.";
  }

  if (!normalized.address || normalized.address.length < 8) {
    errors.address = "Please enter a complete address.";
  }

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    errors.email = "Email format looks invalid.";
  }

  if (!normalized.service_type_id) {
    errors.service_type_id = "Service type is required.";
  }

  if (!normalized.cleaning_frequency) {
    errors.cleaning_frequency = "Cleaning frequency is required.";
  }

  if (
    Number.isNaN(normalized.estimated_duration_min) ||
    normalized.estimated_duration_min < 30 ||
    normalized.estimated_duration_min > 420
  ) {
    errors.estimated_duration_min = "Estimated duration must be between 30 and 420 minutes.";
  }

  if (!ACQUISITION_SOURCES.includes(normalized.acquisition_source)) {
    errors.acquisition_source = "Acquisition source is invalid.";
  }

  const duplicate = db.clients.find((client) => {
    if (mode === "edit" && client.id === clientId) {
      return false;
    }

    return (
      client.full_name.toLowerCase() === normalized.full_name.toLowerCase() &&
      client.address.toLowerCase() === normalized.address.toLowerCase()
    );
  });

  if (duplicate) {
    errors.full_name = "A client with the same name and address already exists.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

function enrichClient(client, db) {
  const serviceType = findById(db.serviceTypes, client.service_type_id);
  return {
    ...client,
    service_type_name: serviceType?.name ?? "Unknown service"
  };
}

export function listClients(db, filters = {}) {
  const { suburb = "all", status = "all", search = "" } = filters;
  const normalizedSearch = search.trim().toLowerCase();

  return db.clients
    .filter((client) => (suburb === "all" ? true : client.suburb === suburb))
    .filter((client) => (status === "all" ? true : client.status === status))
    .filter((client) => {
      if (!normalizedSearch) {
        return true;
      }

      const target = `${client.full_name} ${client.phone} ${client.address}`.toLowerCase();
      return target.includes(normalizedSearch);
    })
    .map((client) => enrichClient(client, db))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function listSuburbs(db) {
  return [...new Set(db.clients.map((client) => client.suburb))].sort();
}

export function groupClientsBySuburb(db) {
  return db.clients.reduce((acc, client) => {
    const bucket = acc[client.suburb] ?? [];
    acc[client.suburb] = [...bucket, enrichClient(client, db)];
    return acc;
  }, {});
}

export function getClientById(db, clientId) {
  const client = findById(db.clients, clientId);
  return client ? enrichClient(client, db) : null;
}

export function getClientDetailSnapshot(db, clientId) {
  const client = getClientById(db, clientId);
  if (!client) {
    return null;
  }

  const notes = db.clientNotes
    .filter((note) => note.client_id === clientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const recurringServices = (db.recurringServices ?? [])
    .filter((item) => item.client_id === clientId)
    .sort((a, b) => (a.next_service_date || "").localeCompare(b.next_service_date || ""));
  const crmProfile = (db.crmProfiles ?? []).find((item) => item.client_id === clientId) ?? null;
  const invoiceRows = (db.invoices ?? []).filter((invoice) => invoice.client_id === clientId);
  const paymentRows = (db.payments ?? []).filter((payment) => payment.client_id === clientId);

  const visitHistory = db.scheduledVisits
    .filter((visit) => visit.client_id === clientId)
    .map((visit) => {
      const team = findById(db.teams, visit.team_id);
      const serviceType = findById(db.serviceTypes, visit.service_type_id);
      const log = db.visitLogs.find((item) => item.scheduled_visit_id === visit.id);
      const photos = db.visitPhotos.filter((item) => item.scheduled_visit_id === visit.id);

      return {
        ...visit,
        team_name: team?.name ?? "-",
        service_type_name: serviceType?.name ?? "-",
        actual_start: log?.actual_start ?? null,
        actual_finish: log?.actual_finish ?? null,
        actual_duration_min: log?.actual_duration_min ?? null,
        notes: log?.notes ?? "",
        delta_min: durationDelta(visit.estimated_duration_min, log?.actual_duration_min),
        lateness_min: calculateLatenessMin(visit.estimated_start, log?.actual_start),
        photos
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = visitHistory.filter((visit) => visit.status === "completed");
  const onTimeCompleted = completed.filter((visit) => (visit.delta_min ?? 0) <= 0).length;
  const overrunVisits = completed.filter((visit) => (visit.delta_min ?? 0) > 0).length;
  const proofVisits = visitHistory.filter((visit) => visit.photos.length > 0).length;
  const totalRevenue = visitHistory.reduce((total, visit) => total + (visit.price ?? 0), 0);
  const outstandingBalance = invoiceRows.reduce((total, invoice) => total + (invoice.balance_due ?? 0), 0);
  const paidTotal = paymentRows
    .filter((payment) => payment.status === "captured")
    .reduce((total, payment) => total + (payment.amount ?? 0), 0);
  const averageActualDuration =
    completed.length > 0
      ? Math.round(completed.reduce((total, visit) => total + (visit.actual_duration_min ?? 0), 0) / completed.length)
      : null;
  const averageDeltaMin =
    completed.length > 0
      ? Math.round(completed.reduce((total, visit) => total + (visit.delta_min ?? 0), 0) / completed.length)
      : null;
  const geocodeReady = client.latitude != null && client.longitude != null;

  const nextVisit = visitHistory
    .filter((visit) => visit.status === "scheduled" || visit.status === "in_progress")
    .sort((a, b) => `${a.date}-${a.estimated_start}`.localeCompare(`${b.date}-${b.estimated_start}`))[0] ?? null;

  const instructionTokens = client.special_instructions
    ? client.special_instructions
        .split(/[,.;]/)
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  return {
    client,
    crmProfile,
    notes,
    recurringServices,
    visitHistory,
    nextVisit,
    instructionTokens,
    metrics: {
      totalVisits: visitHistory.length,
      completedVisits: completed.length,
      averageActualDuration,
      averageDeltaMin,
      overrunVisits,
      onTimeRate: completed.length ? Number((onTimeCompleted / completed.length).toFixed(2)) : 0,
      proofCoverageRate: visitHistory.length ? Number((proofVisits / visitHistory.length).toFixed(2)) : 0,
      geocodeReady,
      totalRevenue,
      outstandingBalance,
      paidTotal
    }
  };
}

export function createClientRecord(db, payload) {
  const mutable = cloneDatabase(db);
  const validation = validateClientPayload(payload, mutable, { mode: "create" });

  if (!validation.isValid) {
    return {
      db,
      errors: validation.errors
    };
  }

  const nowIso = new Date().toISOString();
  const nextId = buildNextId(mutable.clients, "c-");
  const normalized = validation.normalized;

  mutable.clients.push({
    id: nextId,
    organization_id: appEnv.organizationId,
    full_name: normalized.full_name,
    phone: normalized.phone,
    email: normalized.email || "",
    suburb: normalized.suburb,
    address: normalized.address,
    latitude: null,
    longitude: null,
    geo_source: "none",
    geocode_status: "pending",
    service_type_id: normalized.service_type_id,
    cleaning_frequency: normalized.cleaning_frequency,
    estimated_duration_min: normalized.estimated_duration_min,
    acquisition_source: normalized.acquisition_source,
    referral_source: normalized.referral_source || "",
    notes_summary: normalized.notes_summary || "",
    special_instructions: normalized.special_instructions || "",
    status: "active",
    last_cleaning_at: null,
    created_at: nowIso,
    updated_at: nowIso
  });

  if (!mutable.crmProfiles) {
    mutable.crmProfiles = [];
  }

  mutable.crmProfiles.push({
    id: buildNextId(mutable.crmProfiles, "crm-"),
    organization_id: appEnv.organizationId,
    client_id: nextId,
    lifecycle_stage: "new",
    lead_status: "customer",
    acquisition_source: normalized.acquisition_source,
    acquisition_channel: normalized.acquisition_source === "referral" ? "customer_referral" : normalized.acquisition_source,
    referral_source: normalized.referral_source || "",
    churn_risk: "medium",
    vip_level: "none",
    win_back_eligible: false,
    reactivation_candidate: false,
    upsell_signal: "medium",
    deep_clean_interest: "medium",
    notes: "",
    created_at: nowIso,
    updated_at: nowIso
  });

  return {
    db: mutable,
    createdId: nextId,
    errors: {}
  };
}

export function updateClientRecord(db, clientId, payload) {
  const mutable = cloneDatabase(db);
  const validation = validateClientPayload(payload, mutable, { mode: "edit", clientId });

  if (!validation.isValid) {
    return {
      db,
      errors: validation.errors
    };
  }

  const index = mutable.clients.findIndex((client) => client.id === clientId);
  if (index < 0) {
    return {
      db,
      errors: {
        root: "Client record not found."
      }
    };
  }

  const normalized = validation.normalized;
  mutable.clients[index] = {
    ...mutable.clients[index],
    ...normalized,
    updated_at: new Date().toISOString()
  };

  const crmIndex = (mutable.crmProfiles ?? []).findIndex((item) => item.client_id === clientId);
  if (crmIndex >= 0) {
    mutable.crmProfiles[crmIndex] = {
      ...mutable.crmProfiles[crmIndex],
      acquisition_source: normalized.acquisition_source,
      referral_source: normalized.referral_source || mutable.crmProfiles[crmIndex].referral_source,
      updated_at: new Date().toISOString()
    };
  }

  return {
    db: mutable,
    errors: {}
  };
}

export function setClientStatus(db, clientId, status) {
  const mutable = cloneDatabase(db);
  const index = mutable.clients.findIndex((client) => client.id === clientId);

  if (index < 0) {
    return db;
  }

  mutable.clients[index] = {
    ...mutable.clients[index],
    status,
    updated_at: new Date().toISOString()
  };

  return mutable;
}

export function deleteClientRecord(db, clientId) {
  const mutable = cloneDatabase(db);
  const hasVisitHistory = mutable.scheduledVisits.some((visit) => visit.client_id === clientId);

  if (hasVisitHistory) {
    return {
      db: setClientStatus(mutable, clientId, "inactive"),
      hardDeleted: false,
      softArchived: true
    };
  }

  mutable.clients = removeById(mutable.clients, clientId);
  mutable.clientNotes = mutable.clientNotes.filter((note) => note.client_id !== clientId);
  mutable.recurringServices = mutable.recurringServices.filter((service) => service.client_id !== clientId);
  mutable.reminders = mutable.reminders.filter((reminder) => reminder.client_id !== clientId);
  mutable.crmProfiles = (mutable.crmProfiles ?? []).filter((profile) => profile.client_id !== clientId);
  mutable.clientSubscriptions = (mutable.clientSubscriptions ?? []).filter((item) => item.client_id !== clientId);
  const removedPaymentIds = (mutable.payments ?? [])
    .filter((item) => item.client_id === clientId)
    .map((item) => item.id);
  mutable.payments = (mutable.payments ?? []).filter((item) => item.client_id !== clientId);
  mutable.paymentEvents = (mutable.paymentEvents ?? []).filter(
    (event) => !removedPaymentIds.includes(event.payment_id)
  );
  mutable.referrals = (mutable.referrals ?? []).filter(
    (item) => item.referrer_client_id !== clientId && item.referred_client_id !== clientId
  );
  mutable.portalAccounts = (mutable.portalAccounts ?? []).filter((item) => item.client_id !== clientId);

  return {
    db: mutable,
    hardDeleted: true,
    softArchived: false
  };
}

export function addClientNoteRecord(db, clientId, payload) {
  const mutable = cloneDatabase(db);
  const body = safeTrim(payload.body);

  if (!body) {
    return {
      db,
      errors: {
        body: "Note body cannot be empty."
      }
    };
  }

  const noteId = buildNextId(mutable.clientNotes, "cn-");
  mutable.clientNotes.push({
    id: noteId,
    client_id: clientId,
    note_type: safeTrim(payload.note_type) || "instruction",
    body,
    is_active: true,
    created_by: payload.created_by || "ops-ui",
    created_at: new Date().toISOString()
  });

  return {
    db: mutable,
    errors: {},
    noteId
  };
}

export function updateClientNoteRecord(db, noteId, payload) {
  const mutable = cloneDatabase(db);
  const noteIndex = mutable.clientNotes.findIndex((note) => note.id === noteId);

  if (noteIndex < 0) {
    return db;
  }

  mutable.clientNotes[noteIndex] = {
    ...mutable.clientNotes[noteIndex],
    note_type: safeTrim(payload.note_type) || mutable.clientNotes[noteIndex].note_type,
    body: safeTrim(payload.body) || mutable.clientNotes[noteIndex].body
  };

  return mutable;
}

export function setClientNoteActiveState(db, noteId, isActive) {
  const mutable = cloneDatabase(db);
  const noteIndex = mutable.clientNotes.findIndex((note) => note.id === noteId);

  if (noteIndex < 0) {
    return db;
  }

  mutable.clientNotes[noteIndex] = {
    ...mutable.clientNotes[noteIndex],
    is_active: isActive
  };

  return mutable;
}
