import { cloneDatabase, findById } from "../helpers";
import { durationDelta } from "../../utils/scheduleEstimator";

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

  const notes = db.clientNotes.filter((note) => note.client_id === clientId && note.is_active);

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
        actual_duration_min: log?.actual_duration_min ?? null,
        notes: log?.notes ?? "",
        delta_min: durationDelta(visit.estimated_duration_min, log?.actual_duration_min),
        photos
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = visitHistory.filter((visit) => visit.status === "completed");
  const averageActualDuration =
    completed.length > 0
      ? Math.round(completed.reduce((total, visit) => total + (visit.actual_duration_min ?? 0), 0) / completed.length)
      : null;

  return {
    client,
    notes,
    visitHistory,
    metrics: {
      totalVisits: visitHistory.length,
      completedVisits: completed.length,
      averageActualDuration
    }
  };
}

export function createClientRecord(db, payload) {
  const mutable = cloneDatabase(db);
  const nowIso = new Date().toISOString();
  const nextId = `c-${String(mutable.clients.length + 1).padStart(3, "0")}`;

  mutable.clients.push({
    id: nextId,
    full_name: payload.full_name,
    phone: payload.phone,
    email: payload.email || "",
    suburb: payload.suburb,
    address: payload.address,
    service_type_id: payload.service_type_id,
    cleaning_frequency: payload.cleaning_frequency,
    estimated_duration_min: Number(payload.estimated_duration_min ?? 90),
    notes_summary: payload.notes_summary || "",
    special_instructions: payload.special_instructions || "",
    status: "active",
    last_cleaning_at: null,
    created_at: nowIso,
    updated_at: nowIso
  });

  return mutable;
}
