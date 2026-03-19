import { appEnv } from "../../config/env";

const EARTH_RADIUS_KM = 6371;

const SUBURB_CENTROIDS = {
  Ponsonby: { latitude: -36.8558, longitude: 174.7417 },
  "Mount Eden": { latitude: -36.8775, longitude: 174.7504 },
  "New Lynn": { latitude: -36.9102, longitude: 174.6848 },
  Takapuna: { latitude: -36.7853, longitude: 174.7684 },
  Manukau: { latitude: -36.9928, longitude: 174.8788 }
};

const REGION_CENTROIDS = {
  Central: { latitude: -36.8483, longitude: 174.7633 },
  "North Shore": { latitude: -36.7871, longitude: 174.7693 },
  South: { latitude: -36.9928, longitude: 174.8788 }
};

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeCoordinatePair(latitude, longitude) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (lat == null || lng == null) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6))
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(origin, destination) {
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function buildPoint(base, coordinates, quality) {
  if (!coordinates) {
    return {
      ...base,
      latitude: null,
      longitude: null,
      quality: "missing",
      isPrecise: false
    };
  }

  return {
    ...base,
    ...coordinates,
    quality,
    isPrecise: quality === "exact"
  };
}

function getSuburbCentroid(suburb) {
  return SUBURB_CENTROIDS[suburb] ?? null;
}

function getRegionCentroid(region) {
  return REGION_CENTROIDS[region] ?? null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getMapProviderMeta() {
  const provider = (appEnv.mapProvider || "mock").toLowerCase();
  return {
    provider,
    webhookConfigured: Boolean(appEnv.mapWebhookUrl),
    mode: provider === "webhook" && appEnv.mapWebhookUrl ? "provider-ready" : "heuristic"
  };
}

export function resolveClientCoordinate(client) {
  const precise = normalizeCoordinatePair(client?.latitude, client?.longitude);
  if (precise) {
    return buildPoint(
      {
        label: client?.full_name ?? "Client",
        suburb: client?.suburb ?? "-",
        source: client?.geo_source || "client_record",
        geocode_status: client?.geocode_status || "verified"
      },
      precise,
      "exact"
    );
  }

  const suburbEstimate = getSuburbCentroid(client?.suburb);
  if (suburbEstimate) {
    return buildPoint(
      {
        label: client?.full_name ?? "Client",
        suburb: client?.suburb ?? "-",
        source: "suburb_centroid",
        geocode_status: client?.geocode_status || "estimated"
      },
      suburbEstimate,
      "estimated"
    );
  }

  return buildPoint(
    {
      label: client?.full_name ?? "Client",
      suburb: client?.suburb ?? "-",
      source: "unresolved",
      geocode_status: client?.geocode_status || "missing"
    },
    null,
    "missing"
  );
}

export function resolveTeamDepotCoordinate(team) {
  const precise = normalizeCoordinatePair(team?.depot_latitude, team?.depot_longitude);
  if (precise) {
    return buildPoint(
      {
        label: `${team?.name ?? "Team"} depot`,
        suburb: team?.region ?? "-",
        source: "team_depot"
      },
      precise,
      "exact"
    );
  }

  const regionEstimate = getRegionCentroid(team?.region);
  if (regionEstimate) {
    return buildPoint(
      {
        label: `${team?.name ?? "Team"} regional hub`,
        suburb: team?.region ?? "-",
        source: "region_centroid"
      },
      regionEstimate,
      "estimated"
    );
  }

  return buildPoint(
    {
      label: `${team?.name ?? "Team"} depot`,
      suburb: team?.region ?? "-",
      source: "unresolved"
    },
    null,
    "missing"
  );
}

export function estimateTravelLeg(origin, destination, options = {}) {
  const averageSpeedKph = options.averageSpeedKph ?? 34;
  const minimumTravelMin = options.minimumTravelMin ?? 5;
  const fallbackTravelMin = options.fallbackTravelMin ?? 15;
  const sameSuburb = origin?.suburb && destination?.suburb && origin.suburb === destination.suburb;

  if (origin?.latitude != null && origin?.longitude != null && destination?.latitude != null && destination?.longitude != null) {
    const distanceKm = haversineDistanceKm(origin, destination);
    const driveMinutes = Math.round((distanceKm / Math.max(5, averageSpeedKph)) * 60);

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      travelMinutes: clamp(driveMinutes, minimumTravelMin, 180),
      confidence:
        origin.quality === "exact" && destination.quality === "exact"
          ? "high"
          : origin.quality === "missing" || destination.quality === "missing"
            ? "low"
            : "medium"
    };
  }

  const distanceFallback = sameSuburb ? 3.2 : 8.8;
  return {
    distanceKm: Number(distanceFallback.toFixed(2)),
    travelMinutes: fallbackTravelMin,
    confidence: "low"
  };
}

export function summarizeCoordinateCoverage(points = []) {
  const summary = points.reduce(
    (acc, point) => {
      acc.total += 1;
      if (point.quality === "exact") {
        acc.exact += 1;
      } else if (point.quality === "estimated") {
        acc.estimated += 1;
      } else {
        acc.missing += 1;
      }
      return acc;
    },
    {
      total: 0,
      exact: 0,
      estimated: 0,
      missing: 0
    }
  );

  return {
    ...summary,
    coveragePct: summary.total ? Number(((summary.total - summary.missing) / summary.total).toFixed(2)) : 0,
    exactPct: summary.total ? Number((summary.exact / summary.total).toFixed(2)) : 0
  };
}

export function buildRoutePreview({ team, orderedStops = [] }) {
  const origin = resolveTeamDepotCoordinate(team);
  const markers = [
    {
      type: "depot",
      order: 0,
      label: origin.label,
      suburb: origin.suburb,
      latitude: origin.latitude,
      longitude: origin.longitude,
      quality: origin.quality
    },
    ...orderedStops.map((stop, index) => ({
      type: "visit",
      order: index + 1,
      visit_id: stop.visit_id,
      client_id: stop.client_id,
      label: stop.client_name,
      suburb: stop.suburb,
      latitude: stop.point.latitude,
      longitude: stop.point.longitude,
      quality: stop.point.quality
    }))
  ];

  const coordinateMarkers = markers.filter((marker) => marker.latitude != null && marker.longitude != null);
  const center =
    coordinateMarkers.length > 0
      ? {
          latitude: Number(
            (
              coordinateMarkers.reduce((total, marker) => total + marker.latitude, 0) / coordinateMarkers.length
            ).toFixed(6)
          ),
          longitude: Number(
            (
              coordinateMarkers.reduce((total, marker) => total + marker.longitude, 0) / coordinateMarkers.length
            ).toFixed(6)
          )
        }
      : null;

  return {
    provider: getMapProviderMeta(),
    center,
    markers,
    polyline: coordinateMarkers.map((marker) => ({
      latitude: marker.latitude,
      longitude: marker.longitude
    })),
    mapReady: coordinateMarkers.length >= 2
  };
}

