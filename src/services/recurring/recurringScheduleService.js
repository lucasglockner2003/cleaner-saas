/**
 * Recurring scheduling contract placeholder.
 * Full automation is intentionally deferred, but this interface ensures
 * recurrence logic can evolve without touching page code.
 */

export function listRecurringPreferences(db) {
  return db.recurringServices;
}

export function generateRecurringVisitsPlaceholder(recurringService) {
  return {
    recurringServiceId: recurringService.id,
    generated: false,
    reason: "Automated recurring generation is deferred in MVP."
  };
}

