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

