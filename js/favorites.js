/**
 * Gestion des favoris persistants (localStorage)
 */

const STORAGE_KEY = "tmdb:favorites";

function canUseStorage() {
  try {
    const testKey = "__tmdb_storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

const storageAvailable = canUseStorage();

function loadFavorites() {
  if (!storageAvailable) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

let favoritesCache = loadFavorites();

function saveFavorites(favorites) {
  favoritesCache = favorites;
  if (!storageAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    // stockage indisponible, on garde en mémoire
  }
}

function notifyFavoritesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("favorites:updated", {
      detail: { count: favoritesCache.length },
    }),
  );
}

function toFavoriteMovie(movie) {
  if (!movie || !movie.id) return null;

  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    popularity: movie.popularity,
  };
}

function getFavorites() {
  return [...favoritesCache];
}

function isFavorite(movieId) {
  const id = Number(movieId);
  return favoritesCache.some((movie) => movie.id === id);
}

function addFavorite(movie) {
  const payload = toFavoriteMovie(movie);
  if (!payload) return false;
  if (isFavorite(payload.id)) return false;

  const next = [...favoritesCache, payload];
  saveFavorites(next);
  notifyFavoritesUpdated();
  return true;
}

function removeFavorite(movieId) {
  const id = Number(movieId);
  if (!isFavorite(id)) return false;

  const next = favoritesCache.filter((movie) => movie.id !== id);
  saveFavorites(next);
  notifyFavoritesUpdated();
  return true;
}

function toggleFavorite(movie) {
  if (!movie || !movie.id) {
    return { isFavorite: false, changed: false };
  }

  const id = Number(movie.id);
  if (isFavorite(id)) {
    const changed = removeFavorite(id);
    return { isFavorite: false, changed };
  }

  const changed = addFavorite(movie);
  return { isFavorite: true, changed };
}

export {
  getFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  toFavoriteMovie,
};
