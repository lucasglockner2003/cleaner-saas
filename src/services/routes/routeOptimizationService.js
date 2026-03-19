import { findById } from "../helpers";
import {
  buildRoutePreview,
  estimateTravelLeg,
  getMapProviderMeta,
  resolveClientCoordinate,
  resolveTeamDepotCoordinate,
  summarizeCoordinateCoverage
} from "../maps/mapProviderService";

const DEFAULT_ROUTE_SETTINGS = {
  averageSpeedKph: 34,
  fallbackTravelMin: 15,
  minimumTravelMin: 5
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNumber(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function sortByOrderIndex(visits = []) {
  return [...visits].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

function buildStop(db, visit) {
  const client = findById(db.clients, visit.client_id);
  const point = resolveClientCoordinate(client);

  return {
    visit_id: visit.id,
    client_id: visit.client_id,
    client_name: client?.full_name ?? "Unknown client",
    suburb: client?.suburb ?? "-",
    order_index: visit.order_index ?? 0,
    estimated_duration_min: visit.estimated_duration_min ?? 0,
    status: visit.status,
    point
  };
}

function evaluateRoute(team, orderedStops = [], options = {}) {
  const settings = {
    ...DEFAULT_ROUTE_SETTINGS,
    ...options
  };
  if (!orderedStops.length) {
    return {
      orderedStops: [],
      orderedVisitIds: [],
      estimatedDistanceKm: 0,
      estimatedTravelMin: 0,
      averageLegKm: 0,
      longestLegKm: 0,
      lowConfidenceLegs: 0,
      suggestedTravelBufferMin: 15,
      legs: [],
      coordinateCoverage: summarizeCoordinateCoverage([])
    };
  }

  const origin = resolveTeamDepotCoordinate(team);

  let cursor = origin;
  let totalDistanceKm = 0;
  let totalTravelMin = 0;
  let longestLegKm = 0;
  const legs = [];

  orderedStops.forEach((stop, index) => {
    const leg = estimateTravelLeg(cursor, stop.point, settings);
    totalDistanceKm += leg.distanceKm;
    totalTravelMin += leg.travelMinutes;
    longestLegKm = Math.max(longestLegKm, leg.distanceKm);

    legs.push({
      index: index + 1,
      visit_id: stop.visit_id,
      from_label: cursor.label,
      to_label: stop.client_name,
      from_suburb: cursor.suburb ?? "-",
      to_suburb: stop.suburb,
      distance_km: leg.distanceKm,
      travel_min: leg.travelMinutes,
      confidence: leg.confidence
    });

    cursor = stop.point;
  });

  const coverage = summarizeCoordinateCoverage(orderedStops.map((stop) => stop.point));
  const lowConfidenceLegs = legs.filter((leg) => leg.confidence === "low").length;

  let suggestedTravelBufferMin = 12;
  if (longestLegKm >= 10) {
    suggestedTravelBufferMin += 6;
  } else if (longestLegKm >= 6) {
    suggestedTravelBufferMin += 3;
  }
  if (lowConfidenceLegs > 0) {
    suggestedTravelBufferMin += 3;
  }
  if (coverage.coveragePct < 0.7) {
    suggestedTravelBufferMin += 4;
  }

  return {
    orderedStops,
    orderedVisitIds: orderedStops.map((stop) => stop.visit_id),
    estimatedDistanceKm: normalizeNumber(totalDistanceKm),
    estimatedTravelMin: Math.round(totalTravelMin),
    averageLegKm: orderedStops.length ? normalizeNumber(totalDistanceKm / orderedStops.length) : 0,
    longestLegKm: normalizeNumber(longestLegKm),
    lowConfidenceLegs,
    suggestedTravelBufferMin: clamp(Math.round(suggestedTravelBufferMin), 10, 30),
    legs,
    coordinateCoverage: coverage
  };
}

function chooseNextStop(cursor, remainingStops, options) {
  const scored = remainingStops.map((candidate) => {
    const leg = estimateTravelLeg(cursor, candidate.point, options);
    const sameSuburbBonus = cursor.suburb && candidate.suburb === cursor.suburb ? -0.75 : 0;
    const confidencePenalty = leg.confidence === "low" ? 1.3 : leg.confidence === "medium" ? 0.5 : 0;
    const score = leg.distanceKm + sameSuburbBonus + confidencePenalty;

    return {
      candidate,
      score
    };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.candidate ?? null;
}

function buildNearestNeighborOrder(team, stops, options = {}) {
  if (stops.length <= 1) {
    return stops;
  }

  const settings = {
    ...DEFAULT_ROUTE_SETTINGS,
    ...options
  };

  const remaining = [...stops];
  const ordered = [];
  let cursor = resolveTeamDepotCoordinate(team);

  while (remaining.length) {
    const next = chooseNextStop(cursor, remaining, settings);
    if (!next) {
      ordered.push(...remaining);
      break;
    }

    ordered.push(next);
    const nextIndex = remaining.findIndex((item) => item.visit_id === next.visit_id);
    remaining.splice(nextIndex, 1);
    cursor = next.point;
  }

  return ordered;
}

function buildSuburbDistribution(stops = []) {
  const buckets = {};
  stops.forEach((stop) => {
    const key = stop.suburb || "Unknown";
    buckets[key] = (buckets[key] ?? 0) + 1;
  });

  const rows = Object.entries(buckets)
    .map(([suburb, visits]) => ({
      suburb,
      visits
    }))
    .sort((a, b) => b.visits - a.visits);

  const leading = rows[0]?.visits ?? 0;
  const total = stops.length;

  return {
    rows,
    concentrationPct: total ? Number((leading / total).toFixed(2)) : 0
  };
}

function hasOrderChanged(currentVisitIds, recommendedVisitIds) {
  if (currentVisitIds.length !== recommendedVisitIds.length) {
    return true;
  }

  return currentVisitIds.some((visitId, index) => visitId !== recommendedVisitIds[index]);
}

export function buildRoutePlan({ db, scheduleDay, visits = [], options = {} }) {
  const sortedVisits = sortByOrderIndex(visits);
  const team = findById(db.teams, scheduleDay?.team_id ?? sortedVisits[0]?.team_id);
  const currentStops = sortedVisits.map((visit) => buildStop(db, visit));
  const recommendedStops = buildNearestNeighborOrder(team, currentStops, options);

  const currentMetrics = evaluateRoute(team, currentStops, options);
  const recommendedMetrics = evaluateRoute(team, recommendedStops, options);

  const distanceKmSaved = normalizeNumber(currentMetrics.estimatedDistanceKm - recommendedMetrics.estimatedDistanceKm);
  const travelMinSaved = Math.round(currentMetrics.estimatedTravelMin - recommendedMetrics.estimatedTravelMin);
  const efficiencyGainPct =
    currentMetrics.estimatedTravelMin > 0
      ? Number(((travelMinSaved / currentMetrics.estimatedTravelMin) * 100).toFixed(1))
      : 0;
  const suburbDistribution = buildSuburbDistribution(recommendedStops);
  const changed = hasOrderChanged(currentMetrics.orderedVisitIds, recommendedMetrics.orderedVisitIds);

  const recommendedStopsWithOrder = recommendedMetrics.orderedStops.map((stop, index) => ({
    visit_id: stop.visit_id,
    client_id: stop.client_id,
    client_name: stop.client_name,
    suburb: stop.suburb,
    current_order: stop.order_index,
    recommended_order: index + 1,
    point_quality: stop.point.quality,
    point_source: stop.point.source
  }));

  return {
    teamId: team?.id ?? null,
    teamName: team?.name ?? "-",
    dayName: scheduleDay?.day_name ?? null,
    date: scheduleDay?.date ?? null,
    strategy: "nearest-neighbor-v1",
    mapProvider: getMapProviderMeta(),
    optimizationReady: recommendedStops.length > 1,
    recommendationChanged: changed,
    current: currentMetrics,
    recommended: {
      ...recommendedMetrics,
      orderedStops: recommendedStopsWithOrder,
      routePreview: buildRoutePreview({
        team,
        orderedStops: recommendedStops
      })
    },
    delta: {
      distanceKmSaved,
      travelMinSaved,
      efficiencyGainPct
    },
    geography: {
      suburbs: suburbDistribution.rows,
      concentrationPct: suburbDistribution.concentrationPct
    }
  };
}

export function getRouteEfficiencySignal(routePlan) {
  if (!routePlan || !routePlan.optimizationReady) {
    return {
      level: "neutral",
      label: "No optimization signal"
    };
  }

  const gain = routePlan.delta?.efficiencyGainPct ?? 0;
  if (gain >= 15) {
    return {
      level: "success",
      label: "Strong optimization opportunity"
    };
  }
  if (gain >= 6) {
    return {
      level: "warning",
      label: "Moderate optimization opportunity"
    };
  }
  return {
    level: "neutral",
    label: "Current order already efficient"
  };
}

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
