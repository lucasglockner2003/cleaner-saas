export function withPersistPlan(result, collections = []) {
  if (result && typeof result === "object" && "db" in result) {
    return {
      ...result,
      persistPlan: {
        collections
      }
    };
  }

  return {
    db: result,
    ok: true,
    errors: {},
    persistPlan: {
      collections
    }
  };
}

