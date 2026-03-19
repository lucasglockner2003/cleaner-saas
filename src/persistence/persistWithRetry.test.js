import { describe, expect, it } from "vitest";
import { persistWithRetry } from "./persistWithRetry";

describe("persistWithRetry", () => {
  it("retries until save succeeds and returns reconciled payload", async () => {
    let calls = 0;
    const db = {
      clients: []
    };

    const result = await persistWithRetry(async () => {
      calls += 1;
      if (calls < 3) {
        return {
          ok: false,
          error: "temporary failure"
        };
      }
      return {
        ok: true,
        reconciledDb: {
          clients: [{ id: "c-001" }]
        },
        stats: {
          conflicts: 1
        }
      };
    }, db, null, 3);

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.reconciledDb.clients).toHaveLength(1);
    expect(result.stats.conflicts).toBe(1);
  });

  it("returns terminal failure after max attempts", async () => {
    const result = await persistWithRetry(
      async () => ({
        ok: false,
        error: "hard failure"
      }),
      {},
      null,
      1
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("hard failure");
  });
});
