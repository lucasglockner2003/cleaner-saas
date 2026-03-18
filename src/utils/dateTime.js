const MINUTES_PER_HOUR = 60;

export function parseTimeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export function minutesToTime(value) {
  const normalized = Math.max(0, value);
  const hours = Math.floor(normalized / MINUTES_PER_HOUR)
    .toString()
    .padStart(2, "0");
  const minutes = (normalized % MINUTES_PER_HOUR).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function minutesBetween(startIso, endIso) {
  if (!startIso || !endIso) {
    return null;
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  const milliseconds = end.getTime() - start.getTime();
  return Math.max(0, Math.round(milliseconds / 60000));
}

export function formatDate(iso, locale = "en-NZ") {
  if (!iso) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium"
  }).format(new Date(iso));
}

export function formatDateTime(iso, locale = "en-NZ") {
  if (!iso) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

