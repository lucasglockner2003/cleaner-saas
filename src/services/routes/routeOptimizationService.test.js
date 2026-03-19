import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import { buildRoutePlan, getRouteEfficiencySignal } from "./routeOptimizationService";

describe("routeOptimizationService", () => {
  it("builds a route recommendation with optimization metadata", () => {
    const db = createSeedDatabase();
    const scheduleDay = db.scheduleDays.find((row) => row.id === "sd-2026-03-20");
    const visits = db.scheduledVisits.filter((row) => row.schedule_day_id === scheduleDay.id);

    const plan = buildRoutePlan({
      db,
      scheduleDay,
      visits
    });

    expect(plan.optimizationReady).toBe(true);
    expect(plan.current.orderedVisitIds).toHaveLength(visits.length);
    expect(plan.recommended.orderedStops).toHaveLength(visits.length);
    expect(plan.recommended.routePreview).toBeTruthy();
    expect(typeof plan.delta.travelMinSaved).toBe("number");
    expect(plan.mapProvider).toBeTruthy();

    const signal = getRouteEfficiencySignal(plan);
    expect(["success", "warning", "neutral"]).toContain(signal.level);
  });
});
