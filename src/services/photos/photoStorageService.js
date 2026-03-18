import { buildNextId, cloneDatabase, safeTrim } from "../helpers";
import { appEnv } from "../../config/env";

/**
 * Storage provider boundary - can be swapped for Supabase Storage, S3, etc.
 */
export const photoStorageProviders = {
  placeholder: {
    name: "placeholder-storage",
    upload(fileName) {
      return {
        ok: true,
        storagePath: `/proof/${fileName}`,
        publicUrl: `https://storage.cleanerops.local/proof/${fileName}`,
        contentType: "image/jpeg",
        sizeBytes: 1500000,
        uploadStatus: "uploaded",
        providerRef: `placeholder-${Date.now()}`
      };
    }
  },
  webhook: {
    name: "webhook-storage",
    upload(fileName) {
      if (!appEnv.photoWebhookUrl) {
        return {
          ok: false,
          storagePath: `/proof/${fileName}`,
          publicUrl: null,
          contentType: "image/jpeg",
          sizeBytes: 0,
          uploadStatus: "failed",
          error: "VITE_PHOTO_WEBHOOK_URL is not configured."
        };
      }

      return {
        ok: true,
        storagePath: `/proof/pending/${fileName}`,
        publicUrl: null,
        contentType: "image/jpeg",
        sizeBytes: 0,
        uploadStatus: "queued",
        providerRef: `webhook-${Date.now()}`
      };
    }
  }
};

function buildPhotoRecord(db, { visitId, phase, fileName, providerResult, metadata = {} }) {
  return {
    id: buildNextId(db.visitPhotos ?? [], "vp-"),
    scheduled_visit_id: visitId,
    phase,
    file_name: fileName,
    storage_path: providerResult.storagePath,
    public_url: providerResult.publicUrl,
    content_type: providerResult.contentType ?? "image/jpeg",
    size_bytes: providerResult.sizeBytes ?? 0,
    upload_status: providerResult.uploadStatus ?? (providerResult.ok ? "uploaded" : "failed"),
    captured_at: new Date().toISOString(),
    captured_by: null,
    proof_group_id: `pg-${visitId}-main`,
    metadata,
    provider_ref: providerResult.providerRef ?? null,
    is_placeholder: providerResult.uploadStatus !== "uploaded"
  };
}

export function listVisitPhotos(db, visitId) {
  return (db.visitPhotos ?? [])
    .filter((photo) => photo.scheduled_visit_id === visitId)
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

export function getVisitProofBundle(db, visitId) {
  const photos = listVisitPhotos(db, visitId);
  const before = photos.filter((photo) => photo.phase === "before");
  const after = photos.filter((photo) => photo.phase === "after");
  const uploaded = photos.filter((photo) => photo.upload_status === "uploaded").length;

  return {
    visitId,
    before,
    after,
    total: photos.length,
    uploaded,
    proofReady: before.length + after.length > 0,
    coverage: {
      before: before.length,
      after: after.length
    }
  };
}

export function getVisitProofTimeline(db, visitId) {
  return listVisitPhotos(db, visitId).map((photo) => ({
    id: photo.id,
    phase: photo.phase,
    file_name: photo.file_name,
    captured_at: photo.captured_at,
    upload_status: photo.upload_status,
    public_url: photo.public_url,
    room: photo.metadata?.room ?? "-",
    angle: photo.metadata?.angle ?? "-",
    proof_group_id: photo.proof_group_id
  }));
}

export function getProofCompletenessOverview(db) {
  const completedVisits = (db.scheduledVisits ?? []).filter((visit) => visit.status === "completed");

  const rows = completedVisits.map((visit) => {
    const bundle = getVisitProofBundle(db, visit.id);
    const needsProof = visit.service_type_id === "st-deep" || visit.service_type_id === "st-move";
    const client = (db.clients ?? []).find((item) => item.id === visit.client_id);
    const team = (db.teams ?? []).find((item) => item.id === visit.team_id);
    return {
      visit_id: visit.id,
      date: visit.date,
      client_id: visit.client_id,
      client_name: client?.full_name ?? "-",
      team_id: visit.team_id,
      team_name: team?.name ?? "-",
      needs_proof: needsProof,
      before_count: bundle.coverage.before,
      after_count: bundle.coverage.after,
      proof_ready: needsProof ? bundle.proofReady : true
    };
  });

  return rows.sort((a, b) => {
    if (a.proof_ready === b.proof_ready) {
      return b.date.localeCompare(a.date);
    }
    return a.proof_ready ? 1 : -1;
  });
}

export function getProofCompletenessStats(db) {
  const rows = getProofCompletenessOverview(db);
  const needsProof = rows.filter((row) => row.needs_proof);
  const readyRequired = needsProof.filter((row) => row.proof_ready);
  const missingRequired = needsProof.filter((row) => !row.proof_ready);

  return {
    totalCompletedVisits: rows.length,
    proofRequiredVisits: needsProof.length,
    proofReadyRequiredVisits: readyRequired.length,
    proofMissingRequiredVisits: missingRequired.length,
    readinessRate: needsProof.length ? Number((readyRequired.length / needsProof.length).toFixed(2)) : 1
  };
}

export function uploadVisitPhotoWithProvider(db, { visitId, phase, fileName, metadata = {}, provider = "placeholder" }) {
  const mutable = cloneDatabase(db);
  const normalizedPhase = phase === "after" ? "after" : "before";
  const normalizedName =
    safeTrim(fileName) || `${visitId}-${normalizedPhase}-${String((mutable.visitPhotos ?? []).length + 1).padStart(3, "0")}.jpg`;
  const preferredProvider = provider || appEnv.photoStorageProvider || "placeholder";
  const adapter = photoStorageProviders[preferredProvider] ?? photoStorageProviders.placeholder;
  const providerResult = adapter.upload(normalizedName);

  const photoRecord = buildPhotoRecord(mutable, {
    visitId,
    phase: normalizedPhase,
    fileName: normalizedName,
    providerResult,
    metadata
  });

  if (!mutable.visitPhotos) {
    mutable.visitPhotos = [];
  }
  mutable.visitPhotos.push(photoRecord);

  return {
    db: mutable,
    ok: providerResult.ok,
    message: providerResult.ok ? "Photo metadata stored." : "Photo metadata stored with failed upload status.",
    photo: photoRecord
  };
}
