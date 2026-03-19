import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import { assignClientSubscription, SUBSCRIPTION_STATUS } from "./subscriptionsService";

describe("subscriptionsService assignments", () => {
  it("creates a client subscription and blocks duplicate active assignment", () => {
    const db = createSeedDatabase();
    const createResult = assignClientSubscription(db, {
      client_id: "c-002",
      plan_id: "sp-basic-weekly",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      start_date: "2026-03-19"
    });

    expect(createResult.ok).toBe(true);
    expect(createResult.db.clientSubscriptions.some((row) => row.client_id === "c-002")).toBe(true);

    const duplicateResult = assignClientSubscription(createResult.db, {
      client_id: "c-002",
      plan_id: "sp-fortnightly",
      status: SUBSCRIPTION_STATUS.ACTIVE,
      start_date: "2026-03-21"
    });

    expect(duplicateResult.ok).toBe(false);
    expect(duplicateResult.message).toContain("active/paused subscription");
  });
});
