import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import { listCustomerLifecycleRows, refreshLifecycleSignals } from "./crmService";

describe("crmService lifecycle transitions", () => {
  it("refreshes lifecycle signals and marks win-back candidates", () => {
    const db = createSeedDatabase();
    const visitIndex = db.scheduledVisits.findIndex((row) => row.client_id === "c-001" && row.status === "completed");
    db.scheduledVisits[visitIndex] = {
      ...db.scheduledVisits[visitIndex],
      date: "2020-01-01"
    };

    const result = refreshLifecycleSignals(db, {
      winBackThresholdDays: 30
    });

    expect(result.ok).toBe(true);
    const rows = listCustomerLifecycleRows(result.db);
    const clientRow = rows.find((row) => row.client_id === "c-001");
    expect(clientRow).toBeTruthy();
    expect(["medium", "high"]).toContain(clientRow.churn_risk);
    expect(clientRow.win_back_eligible).toBe(true);
  });
});
