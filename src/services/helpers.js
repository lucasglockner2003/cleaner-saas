export function findById(collection, id) {
  return collection.find((item) => item.id === id);
}

export function indexById(collection) {
  return collection.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export function cloneDatabase(db) {
  return JSON.parse(JSON.stringify(db));
}

export function sumBy(collection, selector) {
  return collection.reduce((total, item) => total + selector(item), 0);
}

export function buildNextId(collection, prefix) {
  const highest = collection.reduce((max, item) => {
    const numeric = Number(String(item.id ?? "").replace(/[^\d]/g, ""));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function removeById(collection, id) {
  return collection.filter((item) => item.id !== id);
}
