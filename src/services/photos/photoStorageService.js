/**
 * Placeholder service for visit proof storage.
 * Can be replaced later by Supabase Storage or another provider.
 */

export function listVisitPhotos(db, visitId) {
  return db.visitPhotos.filter((photo) => photo.scheduled_visit_id === visitId);
}

export async function uploadVisitPhotoPlaceholder({ visitId, phase, fileName }) {
  return {
    id: `ph-${Date.now()}`,
    scheduled_visit_id: visitId,
    phase,
    file_name: fileName,
    storage_path: `/proof/${fileName}`,
    captured_at: new Date().toISOString(),
    is_placeholder: true
  };
}

