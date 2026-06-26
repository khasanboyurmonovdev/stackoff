// Pure, dependency-free Elo engine for ranking voice-AI stacks.

const DEFAULT_RATING = 1200;
const DEFAULT_K = 24;

// Expected score for A against B: probability-like value in (0,1) that sums to
// 1 across the pair. 0.5 means evenly matched.
export function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Apply one result to a pair. `score` is A's outcome (1 win, 0 loss, 0.5 draw).
// B moves by the mirror amount, so the pair's total rating is conserved.
export function updateRatings(a, b, score, k = DEFAULT_K) {
  const expA = expectedScore(a, b);
  const expB = expectedScore(b, a);
  return {
    ratingA: a + k * (score - expA),
    ratingB: b + k * (1 - score - expB),
  };
}

// K-factor that shrinks as a stack accumulates votes: big early swings settle
// into stable ratings. Starts at 36 (0 votes) and floors at 12.
export function adaptiveK(votes) {
  return Math.max(12, Math.round(36 / (1 + votes / 30)));
}

// Map [{id, rating}] to the same items with a `humanness` 0-100 added via
// min-max scaling (top rating -> 100, bottom -> 0). When every rating is equal
// there is no spread, so everyone gets 50 instead of dividing by zero.
export function normalize(items) {
  const ratings = items.map((it) => it.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = max - min;
  return items.map((it) => ({
    ...it,
    humanness: span === 0 ? 50 : ((it.rating - min) / span) * 100,
  }));
}

// Confidence band around a rating: wide with few votes, narrowing as votes grow.
export function uncertaintyBand(votes) {
  return Math.round(40 / Math.sqrt(votes + 1));
}
