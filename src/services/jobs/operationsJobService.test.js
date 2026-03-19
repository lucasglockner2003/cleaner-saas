import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import {
  createOperationJob,
  OPERATION_JOB_TYPE,
  runOperationJobExecutorCycle
} from "./operationsJobService";

describe("operationsJobService queue", () => {
  it("queues and executes lifecycle refresh jobs", async () => {
    const db = createSeedDatabase();
    const queued = createOperationJob(db, {
      job_type: OPERATION_JOB_TYPE.LIFECYCLE_REFRESH,
      priority: 10,
      payload: {
        winBackThresholdDays: 20
      }
    });

    expect(queued.ok).toBe(true);

    const executed = await runOperationJobExecutorCycle(queued.db, {
      maxJobs: 1
    });

    expect(executed.ok).toBe(true);
    const completed = executed.db.operationJobs.find((row) => row.status === "completed");
    expect(completed).toBeTruthy();
  });
});
