import { minutesToTime, parseTimeToMinutes } from "./dateTime";

export function buildDayEstimation({
  startTime = "08:00",
  breakDurationMin = 30,
  breakAfterVisit = 2,
  travelBufferMin = 15,
  visits = []
}) {
  let timelineCursor = parseTimeToMinutes(startTime);
  const windows = [];
  let totalVisitMinutes = 0;

  visits.forEach((visit, index) => {
    const estimatedDurationMin = visit.estimatedDurationMin ?? visit.estimated_duration_min ?? 0;
    const startMin = timelineCursor;
    const endMin = startMin + estimatedDurationMin;
    totalVisitMinutes += estimatedDurationMin;

    windows.push({
      visitId: visit.id,
      clientId: visit.clientId ?? visit.client_id,
      start: minutesToTime(startMin),
      end: minutesToTime(endMin),
      durationMin: estimatedDurationMin,
      type: "visit"
    });

    timelineCursor = endMin;

    if (index === breakAfterVisit - 1 && breakDurationMin > 0) {
      const breakStart = timelineCursor;
      const breakEnd = breakStart + breakDurationMin;

      windows.push({
        type: "break",
        start: minutesToTime(breakStart),
        end: minutesToTime(breakEnd),
        durationMin: breakDurationMin
      });
      timelineCursor = breakEnd;
    }

    if (index < visits.length - 1) {
      timelineCursor += travelBufferMin;
    }
  });

  const dayStart = parseTimeToMinutes(startTime);
  const projectedEnd = minutesToTime(timelineCursor);
  const totalWorkedMin = timelineCursor - dayStart;
  const utilizationRate = totalWorkedMin > 0 ? totalVisitMinutes / totalWorkedMin : 0;

  return {
    windows,
    projectedEnd,
    totalVisitMinutes,
    totalWorkedMin,
    utilizationRate
  };
}

export function durationDelta(estimatedMin, actualMin) {
  if (actualMin == null || estimatedMin == null) {
    return null;
  }

  return actualMin - estimatedMin;
}

