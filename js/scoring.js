/**
 * Système de scoring personnalisé pour les films
 * Normalise les métriques pour produire un score unique et comparable
 */

const DEFAULT_WEIGHTS = {
  rating: 0.4,
  popularity: 0.3,
  recency: 0.2,
  votes: 0.1,
};
const WEIGHT_KEYS = Object.keys(DEFAULT_WEIGHTS);

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalize(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function getReleaseTimestamp(releaseDate) {
  if (!releaseDate) return 0;
  const timestamp = new Date(releaseDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeWeights(weights) {
  const total = WEIGHT_KEYS.reduce((sum, key) => {
    const w = toNumber(weights[key], 0);
    return sum + w;
  }, 0);

  if (total <= 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  const normalized = {};
  WEIGHT_KEYS.forEach((key) => {
    normalized[key] = toNumber(weights[key], 0) / total;
  });
  return normalized;
}

function getMinMax(values) {
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
}

/**
 * Attribue un score à chaque film puis trie la liste
 * @param {Array} movies - Liste des films à scorer
 * @param {Object} customWeights - Pondération des critères
 * @returns {Array} Films avec score, triés par score décroissant
 */
export function scoreMovies(movies, customWeights = {}) {
  if (!Array.isArray(movies) || movies.length === 0) {
    return [];
  }

  const weights = normalizeWeights({ ...DEFAULT_WEIGHTS, ...customWeights });

  const ratings = movies.map((movie) => toNumber(movie.vote_average, 0));
  const popularities = movies.map((movie) => toNumber(movie.popularity, 0));
  const voteCounts = movies.map((movie) => toNumber(movie.vote_count, 0));
  const releaseDates = movies.map((movie) =>
    getReleaseTimestamp(movie.release_date),
  );

  const ratingRange = getMinMax(ratings);
  const popularityRange = getMinMax(popularities);
  const votesRange = getMinMax(voteCounts);
  const recencyRange = getMinMax(releaseDates);

  const scored = movies.map((movie) => {
    const ratingScore = normalize(
      toNumber(movie.vote_average, 0),
      ratingRange.min,
      ratingRange.max,
    );
    const popularityScore = normalize(
      toNumber(movie.popularity, 0),
      popularityRange.min,
      popularityRange.max,
    );
    const votesScore = normalize(
      toNumber(movie.vote_count, 0),
      votesRange.min,
      votesRange.max,
    );
    const recencyScore = normalize(
      getReleaseTimestamp(movie.release_date),
      recencyRange.min,
      recencyRange.max,
    );

    const score =
      ratingScore * weights.rating +
      popularityScore * weights.popularity +
      recencyScore * weights.recency +
      votesScore * weights.votes;

    return {
      ...movie,
      score,
      scoreDetails: {
        rating: ratingScore,
        popularity: popularityScore,
        recency: recencyScore,
        votes: votesScore,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export { DEFAULT_WEIGHTS };
