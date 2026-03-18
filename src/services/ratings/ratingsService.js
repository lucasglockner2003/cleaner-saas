export function listRatings(db) {
  return db.ratings;
}

export function getAverageRating(db) {
  if (!db.ratings.length) {
    return null;
  }

  const total = db.ratings.reduce((sum, rating) => sum + rating.score, 0);
  return Number((total / db.ratings.length).toFixed(2));
}

