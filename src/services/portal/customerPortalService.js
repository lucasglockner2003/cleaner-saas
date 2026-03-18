/**
 * Customer portal boundary placeholder.
 * Keeps future client-facing APIs separate from internal operations APIs.
 */

export function getPortalVisitHistoryPlaceholder(clientId) {
  return {
    clientId,
    enabled: false,
    reason: "Customer portal is intentionally deferred in MVP foundation."
  };
}

