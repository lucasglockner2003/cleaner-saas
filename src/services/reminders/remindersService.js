import { findById } from "../helpers";

export function listReminders(db) {
  return db.reminders
    .map((reminder) => {
      const client = findById(db.clients, reminder.client_id);
      const visit = findById(db.scheduledVisits, reminder.scheduled_visit_id);
      return {
        ...reminder,
        client_name: client?.full_name ?? "-",
        visit_date: visit?.date ?? "-"
      };
    })
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
}

export function buildVisitReminderEmail(db, visitId) {
  const visit = findById(db.scheduledVisits, visitId);
  if (!visit) {
    return null;
  }

  const client = findById(db.clients, visit.client_id);
  if (!client) {
    return null;
  }

  return {
    to: client.email,
    subject: `Cleaning reminder for ${visit.date} at ${visit.estimated_start}`,
    body: `Hi ${client.full_name.split(" ")[0]}, this is a reminder that your cleaning is scheduled for ${visit.date} at ${visit.estimated_start}.`
  };
}

/**
 * Placeholder provider contract for future integrations.
 */
export const reminderProviders = {
  email: {
    send: async (_message) => ({
      ok: true,
      providerRef: "placeholder-provider-ref"
    })
  }
};

