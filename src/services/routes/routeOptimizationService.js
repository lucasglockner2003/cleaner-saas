/**
 * Route optimization contract placeholder.
 * Future implementations can call external map/routing services.
 */

export function buildRoutePlanPlaceholder({ teamId, day, stops }) {
  return {
    teamId,
    day,
    strategy: "manual-order",
    estimatedDistanceKm: null,
    estimatedDriveMinutes: null,
    orderedStops: stops,
    optimizationReady: false
  };
}

