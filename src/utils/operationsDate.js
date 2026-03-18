export function resolveOperationalDate(db) {
  const today = new Date().toISOString().slice(0, 10);
  const visitDates = [...new Set(db.scheduledVisits.map((visit) => visit.date))].sort();

  if (visitDates.includes(today)) {
    return today;
  }

  return visitDates.at(-1) ?? today;
}

export function resolveOperationalMonth(db, date) {
  if (date) {
    return date.slice(0, 7);
  }

  const latestDate = resolveOperationalDate(db);
  return latestDate.slice(0, 7);
}

