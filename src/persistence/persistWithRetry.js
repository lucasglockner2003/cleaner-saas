export async function persistWithRetry(saveFn, db, persistPlan, maxAttempts = 2) {
  let attempt = 0;
  let lastResult = null;

  while (attempt <= maxAttempts) {
    // eslint-disable-next-line no-await-in-loop
    const result = await saveFn(db, persistPlan);
    lastResult = result;

    if (result?.ok) {
      return {
        ok: true,
        attempts: attempt + 1,
        reconciledDb: result.reconciledDb ?? null,
        stats: result.stats ?? null
      };
    }

    attempt += 1;
  }

  return {
    ok: false,
    attempts: attempt,
    error: lastResult?.error ?? "Persistence failed after retries.",
    reconciledDb: null,
    stats: lastResult?.stats ?? null
  };
}
