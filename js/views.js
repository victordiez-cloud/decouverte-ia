/**
 * Vues de l'application
 * Contient les templates HTML pour chaque page
 */

import tmdbApi from "./api.js";
import { getImageUrl, isApiKeyConfigured } from "./config.js";
import filterState from "./filterState.js";
import { scoreMovies } from "./scoring.js";
import {
  getFavorites,
  isFavorite,
  toggleFavorite,
  toFavoriteMovie,
} from "./favorites.js";

// Élément principal où injecter le contenu
const app = document.getElementById("app");

/**
 * Afficher le spinner de chargement
 */
function showLoading() {
  app.innerHTML = `
        <div class="loading">
            <div class="loading__spinner"></div>
        </div>
    `;
}

/**
 * Afficher un message d'erreur
 * @param {string} message - Le message d'erreur
 */
function showError(message) {
  app.innerHTML = `
        <div class="error-message">
            <h2>⚠️ Erreur</h2>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Générer la carte d'un film
 * @param {Object} movie - Les données du film
 * @returns {string} HTML de la carte
 */
function createMovieCard(movie) {
  const posterUrl = getImageUrl(movie.poster_path, "poster", "medium");
  const releaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString("fr-FR")
    : "Date inconnue";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const favorite = isFavorite(movie.id);
  const favoritePayload = encodeURIComponent(
    JSON.stringify(toFavoriteMovie(movie)),
  );

  return `
        <article class="movie-card" data-movie-id="${movie.id}">
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="movie-card__poster"
                loading="lazy"
            >
            <button
                type="button"
                class="movie-card__favorite ${favorite ? "is-favorite" : ""}"
                aria-pressed="${favorite ? "true" : "false"}"
                aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                title="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                data-movie="${favoritePayload}"
            >
                ❤
            </button>
            <div class="movie-card__info">
                <h3 class="movie-card__title" title="${movie.title}">${movie.title}</h3>
                <p class="movie-card__date">${releaseDate}</p>
                <span class="movie-card__rating">⭐ ${rating}</span>
            </div>
        </article>
    `;
}

/**
 * Ajouter les événements de clic sur les cartes de films
 */
function addMovieCardListeners() {
  document.querySelectorAll(".movie-card").forEach((card) => {
    card.addEventListener("click", () => {
      const movieId = card.dataset.movieId;
      window.location.hash = `/movie/${movieId}`;
    });
  });

  document.querySelectorAll(".movie-card__favorite").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const encodedMovie = button.dataset.movie;
      if (!encodedMovie) return;

      let moviePayload = null;
      try {
        moviePayload = JSON.parse(decodeURIComponent(encodedMovie));
      } catch (error) {
        moviePayload = null;
      }

      if (!moviePayload) return;

      const result = toggleFavorite(moviePayload);
      const isFav = result.isFavorite;

      button.classList.toggle("is-favorite", isFav);
      button.setAttribute("aria-pressed", isFav ? "true" : "false");
      button.setAttribute(
        "aria-label",
        isFav ? "Retirer des favoris" : "Ajouter aux favoris",
      );
      button.setAttribute(
        "title",
        isFav ? "Retirer des favoris" : "Ajouter aux favoris",
      );

      const favoritesContainer = button.closest('[data-view="favorites"]');
      if (!isFav && favoritesContainer) {
        const card = button.closest(".movie-card");
        if (card) {
          card.remove();
        }
        const remaining =
          favoritesContainer.querySelectorAll(".movie-card").length;
        const countEl = document.querySelector(".results-count");
        if (countEl) {
          countEl.textContent = `${remaining} film(s) en favori`;
        }
        if (remaining === 0) {
          favoritesView();
        }
      }
    });
  });
}

/**
 * Générer les années pour le select (de l'année actuelle à 1900)
 * @returns {string} Options HTML
 */
function generateYearOptions() {
  const currentYear = new Date().getFullYear();
  let options = '<option value="">Toutes les années</option>';
  for (let year = currentYear; year >= 1900; year--) {
    options += `<option value="${year}">${year}</option>`;
  }
  return options;
}

/**
 * Générer les options de note
 * @returns {string} Options HTML
 */
function generateRatingOptions() {
  let options = '<option value="">Toutes les notes</option>';
  for (let rating = 9; rating >= 1; rating--) {
    options += `<option value="${rating}">${rating}+ ⭐</option>`;
  }
  return options;
}

/**
 * Convertir l'etat des sliders en poids de scoring
 * @returns {{rating: number, popularity: number, recency: number, votes: number}}
 */
function getScoringWeights() {
  const normalized = filterState.getNormalizedWeights();
  return {
    rating: normalized.rating,
    popularity: normalized.popularity,
    recency: normalized.recency,
    votes: 0,
  };
}

/**
 * Générer le HTML du panneau de filtres
 * @param {Array} genres - Liste des genres
 * @returns {string} HTML du panneau
 */
function createFiltersPanel(genres) {
  const state = filterState.getState();
  const languages = filterState.getLanguages();
  const normalizedWeights = filterState.getNormalizedWeights();

  return `
    <div class="filters-panel">
      <div class="filters-panel__header">
        <h3 class="filters-panel__title">🎛️ Filtres</h3>
        <button type="button" class="filters-panel__reset" id="reset-filters">
          Réinitialiser
        </button>
      </div>
      
      <div class="filters-panel__grid">
        <!-- Filtre par genre -->
        <div class="filter-group">
          <label for="filter-genre" class="filter-group__label">Genre</label>
          <select id="filter-genre" class="filter-group__select">
            <option value="">Tous les genres</option>
            ${genres
              .map(
                (g) => `
              <option value="${g.id}" ${state.genre == g.id ? "selected" : ""}>
                ${g.name}
              </option>
            `,
              )
              .join("")}
          </select>
        </div>
        
        <!-- Filtre par année minimum -->
        <div class="filter-group">
          <label for="filter-year" class="filter-group__label">Année minimum</label>
          <select id="filter-year" class="filter-group__select">
            ${generateYearOptions()}
          </select>
        </div>
        
        <!-- Filtre par note minimum -->
        <div class="filter-group">
          <label for="filter-rating" class="filter-group__label">Note minimum</label>
          <select id="filter-rating" class="filter-group__select">
            ${generateRatingOptions()}
          </select>
        </div>
        
        <!-- Filtre par langue -->
        <div class="filter-group">
          <label for="filter-language" class="filter-group__label">Langue originale</label>
          <select id="filter-language" class="filter-group__select">
            <option value="">Toutes les langues</option>
            ${languages
              .map(
                (l) => `
              <option value="${l.iso_639_1}" ${state.language === l.iso_639_1 ? "selected" : ""}>
                ${l.name}
              </option>
            `,
              )
              .join("")}
          </select>
        </div>
      </div>

      <div class="weights-panel">
        <h4 class="weights-panel__title">Pondération du classement</h4>

        <div class="weight-control">
          <div class="weight-control__header">
            <label for="weight-popularity" class="filter-group__label">Popularité</label>
            <span id="weight-popularity-value" class="weight-control__value">${state.weightPopularity}</span>
          </div>
          <input
            id="weight-popularity"
            class="weight-control__slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${state.weightPopularity}"
          >
        </div>

        <div class="weight-control">
          <div class="weight-control__header">
            <label for="weight-rating" class="filter-group__label">Note</label>
            <span id="weight-rating-value" class="weight-control__value">${state.weightRating}</span>
          </div>
          <input
            id="weight-rating"
            class="weight-control__slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${state.weightRating}"
          >
        </div>

        <div class="weight-control">
          <div class="weight-control__header">
            <label for="weight-recency" class="filter-group__label">Récence</label>
            <span id="weight-recency-value" class="weight-control__value">${state.weightRecency}</span>
          </div>
          <input
            id="weight-recency"
            class="weight-control__slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${state.weightRecency}"
          >
        </div>

        <p class="weights-panel__normalized" id="weights-normalized-display">
          Normalisé: Popularité ${(normalizedWeights.popularity * 100).toFixed(0)}% •
          Note ${(normalizedWeights.rating * 100).toFixed(0)}% •
          Récence ${(normalizedWeights.recency * 100).toFixed(0)}%
        </p>
      </div>
      
      ${
        filterState.hasActiveFilters()
          ? `
        <div class="filters-panel__active">
          <span class="filters-panel__count">
            ${filterState.getActiveFiltersCount()} filtre(s) actif(s)
          </span>
        </div>
      `
          : ""
      }
    </div>
  `;
}

/**
 * Mettre a jour les valeurs visibles des sliders et les pourcentages normalises
 */
function updateWeightIndicators() {
  const state = filterState.getState();
  const normalized = filterState.getNormalizedWeights();

  const popularityValue = document.getElementById("weight-popularity-value");
  if (popularityValue) popularityValue.textContent = String(state.weightPopularity);

  const ratingValue = document.getElementById("weight-rating-value");
  if (ratingValue) ratingValue.textContent = String(state.weightRating);

  const recencyValue = document.getElementById("weight-recency-value");
  if (recencyValue) recencyValue.textContent = String(state.weightRecency);

  const normalizedDisplay = document.getElementById("weights-normalized-display");
  if (normalizedDisplay) {
    normalizedDisplay.textContent =
      `Normalisé: Popularité ${(normalized.popularity * 100).toFixed(0)}% • ` +
      `Note ${(normalized.rating * 100).toFixed(0)}% • ` +
      `Récence ${(normalized.recency * 100).toFixed(0)}%`;
  }
}

// Memoire de la derniere surprise (pour eviter les doublons successifs)
let lastSurpriseId = null;
let surpriseTotalPagesCache = null;
let surpriseTotalPagesCacheTime = 0;
const SURPRISE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_TMDB_DISCOVER_PAGE = 500;
const RANDOM_DISCOVER_PARAMS = {
  sortBy: "popularity.desc",
  includeAdult: false,
  minVotes: 20,
};

function createSurpriseButton(buttonId, label = "Surprise Me", extraClass = "") {
  const classes = ["surprise-button", extraClass].filter(Boolean).join(" ");
  return `
    <button type="button" id="${buttonId}" class="${classes}">
      <span class="surprise-button__icon">🎲</span>
      <span class="surprise-button__label">${label}</span>
    </button>
  `;
}

function pickRandomMovieFromResults(results, excludedIds = []) {
  const blocked = new Set(
    [lastSurpriseId, ...excludedIds].filter(Boolean).map((id) => Number(id)),
  );
  const candidates = (results || []).filter(
    (movie) => movie && movie.id && !blocked.has(Number(movie.id)),
  );
  if (candidates.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

async function getRandomMovieFromApi(excludedIds = []) {
  const now = Date.now();
  const shouldRefreshPages =
    !surpriseTotalPagesCache ||
    now - surpriseTotalPagesCacheTime > SURPRISE_CACHE_TTL_MS;

  if (shouldRefreshPages) {
    const firstPage = await tmdbApi.discoverMovies({
      ...RANDOM_DISCOVER_PARAMS,
      page: 1,
    });
    surpriseTotalPagesCache = Math.min(
      firstPage.total_pages || 1,
      MAX_TMDB_DISCOVER_PAGE,
    );
    surpriseTotalPagesCacheTime = now;

    const immediateCandidate = pickRandomMovieFromResults(
      firstPage.results,
      excludedIds,
    );
    if (immediateCandidate) return immediateCandidate;
  }

  const totalPages = Math.max(1, surpriseTotalPagesCache || 1);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const randomPage = 1 + Math.floor(Math.random() * totalPages);
    const pageData = await tmdbApi.discoverMovies({
      ...RANDOM_DISCOVER_PARAMS,
      page: randomPage,
    });
    const candidate = pickRandomMovieFromResults(pageData.results, excludedIds);
    if (candidate) return candidate;
  }

  return null;
}

function initSurpriseButton(buttonId, options = {}) {
  const surpriseButton = document.getElementById(buttonId);
  if (!surpriseButton) return;
  const label = surpriseButton.querySelector(".surprise-button__label");
  const defaultLabel = label ? label.textContent : "";

  surpriseButton.disabled = false;

  surpriseButton.addEventListener("click", async () => {
    if (surpriseButton.classList.contains("is-loading")) return;
    surpriseButton.classList.add("is-loading");
    surpriseButton.disabled = true;
    if (label) label.textContent = "Loading...";

    try {
      const candidate = await getRandomMovieFromApi(options.excludeIds || []);
      if (!candidate) {
        throw new Error("Aucun film aléatoire disponible");
      }
      lastSurpriseId = candidate.id;
      window.location.hash = `/movie/${candidate.id}`;
    } catch (error) {
      console.error("Surprise Me error:", error);
      if (label) {
        label.textContent = "Erreur API";
      }
    } finally {
      if (label) {
        setTimeout(() => {
          label.textContent = defaultLabel || "Surprise Me";
        }, 900);
      }
      surpriseButton.disabled = false;
      surpriseButton.classList.remove("is-loading");
    }
  });
}

/**
 * Afficher un message quand aucun film n'est trouvé
 * @returns {string} HTML du message
 */
function createNoResultsMessage() {
  return `
    <div class="no-results">
      <div class="no-results__icon">🎬</div>
      <h3 class="no-results__title">Aucun film trouvé</h3>
      <p class="no-results__text">
        Aucun film ne correspond à vos critères de recherche.
        <br>Essayez de modifier vos filtres.
      </p>
      <button type="button" class="no-results__button" id="clear-filters-btn">
        Effacer les filtres
      </button>
    </div>
  `;
}

/**
 * Afficher un message quand aucun favori n'est enregistré
 * @returns {string} HTML du message
 */
function createNoFavoritesMessage() {
  return `
    <div class="no-results">
      <div class="no-results__icon">💡</div>
      <h3 class="no-results__title">Aucune recommandation pour le moment</h3>
      <p class="no-results__text">
        Ajoutez des films à vos favoris pour les retrouver ici.
        <br>Explorez la section Découverte ou Populaires.
      </p>
      <a href="#/discover" class="no-results__button">Découvrir des films</a>
    </div>
  `;
}

/**
 * Initialiser les écouteurs d'événements des filtres
 * @param {Function} onFilterChange - Callback appelé lors d'un changement
 */
function initFilterListeners(onFilterChange) {
  // Genre
  const genreSelect = document.getElementById("filter-genre");
  if (genreSelect) {
    genreSelect.value = filterState.getState().genre;
    genreSelect.addEventListener("change", (e) => {
      filterState.setFilter("genre", e.target.value);
    });
  }

  // Année
  const yearSelect = document.getElementById("filter-year");
  if (yearSelect) {
    yearSelect.value = filterState.getState().yearMin;
    yearSelect.addEventListener("change", (e) => {
      filterState.setFilter("yearMin", e.target.value);
    });
  }

  // Note
  const ratingSelect = document.getElementById("filter-rating");
  if (ratingSelect) {
    ratingSelect.value = filterState.getState().ratingMin;
    ratingSelect.addEventListener("change", (e) => {
      filterState.setFilter("ratingMin", e.target.value);
    });
  }

  // Langue
  const languageSelect = document.getElementById("filter-language");
  if (languageSelect) {
    languageSelect.value = filterState.getState().language;
    languageSelect.addEventListener("change", (e) => {
      filterState.setFilter("language", e.target.value);
    });
  }

  // Poids: popularite
  const weightPopularity = document.getElementById("weight-popularity");
  if (weightPopularity) {
    weightPopularity.value = String(filterState.getState().weightPopularity);
    weightPopularity.addEventListener("input", (e) => {
      filterState.setFilter("weightPopularity", e.target.value);
    });
  }

  // Poids: note
  const weightRating = document.getElementById("weight-rating");
  if (weightRating) {
    weightRating.value = String(filterState.getState().weightRating);
    weightRating.addEventListener("input", (e) => {
      filterState.setFilter("weightRating", e.target.value);
    });
  }

  // Poids: recence
  const weightRecency = document.getElementById("weight-recency");
  if (weightRecency) {
    weightRecency.value = String(filterState.getState().weightRecency);
    weightRecency.addEventListener("input", (e) => {
      filterState.setFilter("weightRecency", e.target.value);
    });
  }

  // Bouton reset
  const resetBtn = document.getElementById("reset-filters");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      filterState.resetFilters();
    });
  }

  // Bouton clear dans le message "no results"
  const clearBtn = document.getElementById("clear-filters-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      filterState.resetFilters();
    });
  }

  // S'abonner aux changements de filtres
  return filterState.subscribe(onFilterChange);
}

/**
 * Vue: Page d'accueil
 */
export async function homeView() {
  if (!isApiKeyConfigured()) {
    showError(
      "Clé API non configurée. Veuillez ajouter votre clé API dans <code>js/config.js</code>",
    );
    return;
  }

  showLoading();

  try {
    const data = await tmdbApi.getPopularMovies();
    const movies = scoreMovies(data.results).slice(0, 8); // Limiter à 8 films pour l'accueil

    app.innerHTML = `
            <section class="hero">
                <h1 class="hero__title">🎬 Bienvenue sur TMDB Explorer</h1>
                <p class="hero__subtitle">Découvrez les films populaires, les nouveautés et bien plus encore !</p>
            </section>

            <section>
                <div class="results-header results-header--section">
                  <h2 class="section-title">Films Populaires</h2>
                  ${createSurpriseButton("home-surprise-btn")}
                </div>
                <div class="movies-grid">
                    ${movies.map((movie) => createMovieCard(movie)).join("")}
                </div>
            </section>
        `;

    addMovieCardListeners();
    initSurpriseButton("home-surprise-btn");
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Vue: Films populaires
 */
export async function popularView() {
  if (!isApiKeyConfigured()) {
    showError(
      "Clé API non configurée. Veuillez ajouter votre clé API dans <code>js/config.js</code>",
    );
    return;
  }

  showLoading();

  try {
    const data = await tmdbApi.getPopularMovies();
    const movies = scoreMovies(data.results);

    app.innerHTML = `
            <h1 class="page-title">🔥 Films Populaires</h1>
            <div class="results-header">
              <p class="results-count">Triés par score personnalisé</p>
              ${createSurpriseButton("popular-surprise-btn")}
            </div>
            <div class="movies-grid">
                ${movies.map((movie) => createMovieCard(movie)).join("")}
            </div>
        `;

    addMovieCardListeners();
    initSurpriseButton("popular-surprise-btn");
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Vue: Découverte de films avec filtres
 */
export async function discoverView() {
  if (!isApiKeyConfigured()) {
    showError(
      "Clé API non configurée. Veuillez ajouter votre clé API dans <code>js/config.js</code>",
    );
    return;
  }

  showLoading();

  try {
    // Charger les genres si pas encore fait
    if (filterState.getGenres().length === 0) {
      const genresData = await tmdbApi.getGenres();
      filterState.setGenres(genresData.genres);
    }

    const genres = filterState.getGenres();

    let cachedMovies = [];
    let totalResults = 0;

    const renderMovies = () => {
      const resultsContainer = document.getElementById("discover-results");
      if (!resultsContainer) return;

      if (cachedMovies.length === 0) {
        resultsContainer.innerHTML = createNoResultsMessage();
        const clearBtn = document.getElementById("clear-filters-btn");
        if (clearBtn) {
          clearBtn.addEventListener("click", () => {
            filterState.resetFilters();
          });
        }
        return;
      }

      const scoredMovies = scoreMovies(cachedMovies, getScoringWeights());
      resultsContainer.innerHTML = `
        <div class="results-header">
          <p class="results-count">${totalResults} film(s) trouvé(s) — triés par score personnalisé</p>
          ${createSurpriseButton("discover-surprise-btn")}
        </div>
        <div class="movies-grid">
          ${scoredMovies.map((movie) => createMovieCard(movie)).join("")}
        </div>
      `;
      addMovieCardListeners();
      initSurpriseButton("discover-surprise-btn");
    };

    // Fonction pour charger depuis l'API puis afficher les films
    const loadMovies = async () => {
      const resultsContainer = document.getElementById("discover-results");
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="loading">
            <div class="loading__spinner"></div>
          </div>
        `;
      }

      try {
        const apiParams = {
          sortBy: "popularity.desc",
          ...filterState.toApiParams(),
        };

        const data = await tmdbApi.discoverMovies(apiParams);
        cachedMovies = data.results || [];
        totalResults = data.total_results || cachedMovies.length;

        if (resultsContainer) {
          renderMovies();
        }
      } catch (error) {
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="error-message">${error.message}</div>
          `;
        }
      }
    };

    // Afficher la structure de la page
    app.innerHTML = `
      <h1 class="page-title">🎯 Découverte</h1>
      ${createFiltersPanel(genres)}
      <div id="discover-results"></div>
    `;

    // Initialiser les filtres et charger les films
    initFilterListeners(async (_state, meta = {}) => {
      updateWeightIndicators();

      // Mettre à jour l'affichage des filtres actifs
      const filtersPanel = document.querySelector(".filters-panel");
      if (filtersPanel) {
        const activeDiv = filtersPanel.querySelector(".filters-panel__active");
        if (filterState.hasActiveFilters()) {
          if (activeDiv) {
            activeDiv.innerHTML = `
              <span class="filters-panel__count">
                ${filterState.getActiveFiltersCount()} filtre(s) actif(s)
              </span>
            `;
          } else {
            filtersPanel.insertAdjacentHTML(
              "beforeend",
              `
              <div class="filters-panel__active">
                <span class="filters-panel__count">
                  ${filterState.getActiveFiltersCount()} filtre(s) actif(s)
                </span>
              </div>
            `,
            );
          }
        } else if (activeDiv) {
          activeDiv.remove();
        }
      }

      if (meta.changedKey && meta.changedKey.startsWith("weight")) {
        renderMovies();
        return;
      }

      // Recharger les films avec les filtres API
      await loadMovies();
    });

    // Charger les films initiaux
    await loadMovies();
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Vue: Recherche de films
 */
export function searchView() {
  app.innerHTML = `
        <h1 class="page-title">🔍 Rechercher un film</h1>
        <section class="search-section">
            <form class="search-section__form" id="search-form">
                <input 
                    type="text" 
                    class="search-section__input" 
                    id="search-input"
                    placeholder="Entrez le nom d'un film..."
                    autocomplete="off"
                >
                <button type="submit" class="search-section__button">Rechercher</button>
            </form>
        </section>
        <div id="search-results"></div>
    `;

  // Gestionnaire de recherche
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const resultsContainer = document.getElementById("search-results");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();

    if (!query) return;

    if (!isApiKeyConfigured()) {
      resultsContainer.innerHTML = `
                <div class="error-message">
                    Clé API non configurée. Veuillez ajouter votre clé API dans <code>js/config.js</code>
                </div>
            `;
      return;
    }

    resultsContainer.innerHTML = `
            <div class="loading">
                <div class="loading__spinner"></div>
            </div>
        `;

    try {
      const data = await tmdbApi.searchMovies(query);

      if (data.results.length === 0) {
        resultsContainer.innerHTML = `
                    <p style="text-align: center; color: #666; padding: 2rem;">
                        Aucun film trouvé pour "${query}"
                    </p>
                `;
        return;
      }

      resultsContainer.innerHTML = `
                <h2 style="margin: 2rem 0;">Résultats pour "${query}"</h2>
                <div class="movies-grid">
                    ${data.results.map((movie) => createMovieCard(movie)).join("")}
                </div>
            `;

      addMovieCardListeners();
    } catch (error) {
      resultsContainer.innerHTML = `
                <div class="error-message">${error.message}</div>
            `;
    }
  });
}

/**
 * Vue: Détail d'un film
 * @param {string} movieId - L'ID du film
 */
export async function movieDetailView(movieId) {
  if (!isApiKeyConfigured()) {
    showError(
      "Clé API non configurée. Veuillez ajouter votre clé API dans <code>js/config.js</code>",
    );
    return;
  }

  showLoading();

  try {
    const [movie, similar] = await Promise.all([
      tmdbApi.getMovieDetails(movieId),
      tmdbApi.getSimilarMovies(movieId),
    ]);
    const posterUrl = getImageUrl(movie.poster_path, "poster", "large");
    const releaseDate = movie.release_date
      ? new Date(movie.release_date).toLocaleDateString("fr-FR")
      : "Date inconnue";
    const favorite = isFavorite(movie.id);
    const similarMovies =
      similar && Array.isArray(similar.results) ? similar.results : [];

    app.innerHTML = `
            <a href="#/" style="display: inline-block; margin-bottom: 2rem; color: #01b4e4; text-decoration: none;">
                ← Retour à l'accueil
            </a>
            
            <div class="movie-detail">
                <div>
                    <img 
                        src="${posterUrl}" 
                        alt="${movie.title}" 
                        class="movie-detail__poster"
                    >
                </div>
                
                <div class="movie-detail__content">
                    <div class="movie-detail__header">
                        <h1>${movie.title}</h1>
                        <div class="movie-detail__actions">
                          <button
                              type="button"
                              class="movie-detail__favorite ${favorite ? "is-favorite" : ""}"
                              aria-pressed="${favorite ? "true" : "false"}"
                              aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                              title="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                          >
                              ❤
                          </button>
                          ${createSurpriseButton(
                            "detail-surprise-btn",
                            "Surprise Me",
                            "surprise-button--compact",
                          )}
                        </div>
                    </div>
                    ${movie.tagline ? `<p class="movie-detail__tagline">"${movie.tagline}"</p>` : ""}
                    
                    <div class="movie-detail__meta">
                        <span class="movie-detail__badge">📅 ${releaseDate}</span>
                        <span class="movie-detail__badge">⭐ ${movie.vote_average.toFixed(1)}/10</span>
                        <span class="movie-detail__badge">⏱️ ${movie.runtime} min</span>
                    </div>
                    
                    <div class="movie-detail__genres">
                        ${movie.genres
                          .map(
                            (g) => `
                            <span class="movie-detail__genre">${g.name}</span>
                        `,
                          )
                          .join("")}
                    </div>
                    
                    <h3 style="margin: 2rem 0 1rem;">Synopsis</h3>
                    <p class="movie-detail__overview">
                        ${movie.overview || "Aucun synopsis disponible."}
                    </p>
                    
                    ${
                      movie.credits &&
                      movie.credits.cast &&
                      movie.credits.cast.length > 0
                        ? `
                        <h3 style="margin: 2rem 0 1rem;">Casting principal</h3>
                        <p>${movie.credits.cast
                          .slice(0, 5)
                          .map((a) => a.name)
                          .join(", ")}</p>
                    `
                        : ""
                    }
                    
                    ${
                      similarMovies.length > 0
                        ? `
                        <section class="movie-detail__similar" style="margin-top: 3rem;">
                          <h3 style="margin-bottom: 1rem;">Films similaires</h3>
                          <div class="movies-grid">
                            ${similarMovies
                              .slice(0, 8)
                              .map((m) => createMovieCard(m))
                              .join("")}
                          </div>
                        </section>
                      `
                        : ""
                    }
                </div>
            </div>
        `;

    const favoriteButton = document.querySelector(".movie-detail__favorite");
    if (favoriteButton) {
      favoriteButton.addEventListener("click", () => {
        const result = toggleFavorite(movie);
        const isFav = result.isFavorite;
        favoriteButton.classList.toggle("is-favorite", isFav);
        favoriteButton.setAttribute("aria-pressed", isFav ? "true" : "false");
        favoriteButton.setAttribute(
          "aria-label",
          isFav ? "Retirer des favoris" : "Ajouter aux favoris",
        );
        favoriteButton.setAttribute(
          "title",
          isFav ? "Retirer des favoris" : "Ajouter aux favoris",
        );
      });
    }

    initSurpriseButton("detail-surprise-btn", { excludeIds: [movie.id] });

    // Activer la navigation sur les cartes de films similaires
    addMovieCardListeners();
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Vue: Page 404
 */
export function notFoundView() {
  app.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
            <h1 style="font-size: 4rem; margin-bottom: 1rem;">404</h1>
            <p style="font-size: 1.5rem; color: #666; margin-bottom: 2rem;">Page non trouvée</p>
            <a href="#/" style="color: #01b4e4;">Retour à l'accueil</a>
        </div>
    `;
}

/**
 * Vue: Mes recommandations (favoris)
 */
export function favoritesView() {
  const favorites = scoreMovies(getFavorites());

  if (favorites.length === 0) {
    app.innerHTML = `
      <h1 class="page-title">💡 Mes recommandations</h1>
      ${createNoFavoritesMessage()}
    `;
    return;
  }

  app.innerHTML = `
    <h1 class="page-title">💡 Mes recommandations</h1>
    <div class="results-header">
      <p class="results-count">${favorites.length} film(s) en favori</p>
      ${createSurpriseButton("favorites-surprise-btn")}
    </div>
    <div class="movies-grid" data-view="favorites">
      ${favorites.map((movie) => createMovieCard(movie)).join("")}
    </div>
  `;

  addMovieCardListeners();
  initSurpriseButton("favorites-surprise-btn");
}

// Etat local pour la comparaison (confiné à la vue Comparer)
let compareSelection = [];

function formatDateFR(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString("fr-FR") : "Date inconnue";
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTimestampOrNull(dateStr) {
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function getValueState(valueA, valueB) {
  if (valueA === null || valueB === null) {
    return { a: "na", b: "na" };
  }
  if (valueA === valueB) {
    return { a: "tie", b: "tie" };
  }
  return valueA > valueB ? { a: "win", b: "lose" } : { a: "lose", b: "win" };
}

function compareColumnHeader(movie) {
  const poster = getImageUrl(movie.poster_path, "poster", "small");
  return `
    <div class="compare__film-head">
      <img class="compare__film-poster" src="${poster}" alt="${movie.title}" loading="lazy">
      <span class="compare__film-title">${movie.title}</span>
    </div>
  `;
}

function compareTableHTML(a, b) {
  const ratingStates = getValueState(
    toNumberOrNull(a.vote_average),
    toNumberOrNull(b.vote_average),
  );
  const popularityStates = getValueState(
    toNumberOrNull(a.popularity),
    toNumberOrNull(b.popularity),
  );
  const votesStates = getValueState(
    toNumberOrNull(a.vote_count),
    toNumberOrNull(b.vote_count),
  );
  const recencyStates = getValueState(
    toTimestampOrNull(a.release_date),
    toTimestampOrNull(b.release_date),
  );

  return `
    <div class="compare__table-wrap">
      <table class="compare__table" role="table" aria-label="Tableau comparatif des films sélectionnés">
        <thead>
          <tr>
            <th scope="col">Critère</th>
            <th scope="col">${compareColumnHeader(a)}</th>
            <th scope="col">${compareColumnHeader(b)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td scope="row">Note moyenne</td>
            <td class="compare__value compare__value--${ratingStates.a}">
              <span class="compare__badge">⭐ ${a.vote_average?.toFixed?.(1) ?? "N/A"}</span>
            </td>
            <td class="compare__value compare__value--${ratingStates.b}">
              <span class="compare__badge">⭐ ${b.vote_average?.toFixed?.(1) ?? "N/A"}</span>
            </td>
          </tr>
          <tr>
            <td scope="row">Popularité</td>
            <td class="compare__value compare__value--${popularityStates.a}">${a.popularity?.toFixed?.(1) ?? "N/A"}</td>
            <td class="compare__value compare__value--${popularityStates.b}">${b.popularity?.toFixed?.(1) ?? "N/A"}</td>
          </tr>
          <tr>
            <td scope="row">Date de sortie</td>
            <td class="compare__value compare__value--${recencyStates.a}">${formatDateFR(a.release_date)}</td>
            <td class="compare__value compare__value--${recencyStates.b}">${formatDateFR(b.release_date)}</td>
          </tr>
          <tr>
            <td scope="row">Nombre de votes</td>
            <td class="compare__value compare__value--${votesStates.a}">${a.vote_count ?? "N/A"}</td>
            <td class="compare__value compare__value--${votesStates.b}">${b.vote_count ?? "N/A"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderCompareViewPanel() {
  const panel = document.getElementById("compare-panel-local");
  if (!panel) return;

  const header = `
    <div class="compare__header">
      <h2 class="compare__title">Comparer des films</h2>
      <div class="compare__actions">
        <span class="compare__count">${compareSelection.length}/2 sélection(s)</span>
        <button type="button" class="compare__clear" id="compare-clear">Vider</button>
      </div>
    </div>
  `;

  let content = `
    <div class="compare__placeholder">
      Sélectionnez deux films depuis la grille de droite pour comparer.
    </div>
  `;

  if (compareSelection.length === 1) {
    const a = compareSelection[0];
    content = `
      <div class="compare__slots">
        <div class="compare__slot">
          <div class="compare__chip">${a.title}<button class="chip__remove" data-id="${a.id}" aria-label="Retirer">✕</button></div>
        </div>
        <div class="compare__slot compare__slot--empty">Sélectionnez un second film…</div>
      </div>
    `;
  }

  if (compareSelection.length === 2) {
    const [a, b] = compareSelection;
    content = `
      <div class="compare__chips">
        <div class="compare__chip">${a.title}<button class="chip__remove" data-id="${a.id}" aria-label="Retirer">✕</button></div>
        <div class="compare__chip">${b.title}<button class="chip__remove" data-id="${b.id}" aria-label="Retirer">✕</button></div>
      </div>
      ${compareTableHTML(a, b)}
    `;
  }

  panel.innerHTML = header + content;

  const clearBtn = document.getElementById("compare-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      compareSelection = [];
      renderCompareViewPanel();
      document.querySelectorAll('.movie-card.selected').forEach(el => el.classList.remove('selected'));
    });
  }

  panel.querySelectorAll('.chip__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      compareSelection = compareSelection.filter(m => m.id !== id);
      renderCompareViewPanel();
      const card = document.querySelector(`.movie-card[data-movie-id="${id}"]`);
      card?.classList.remove('selected');
    });
  });
}

function toggleCompareSelection(movie) {
  const idx = compareSelection.findIndex((m) => m.id === movie.id);
  if (idx !== -1) {
    compareSelection.splice(idx, 1);
    renderCompareViewPanel();
    const card = document.querySelector(`.movie-card[data-movie-id="${movie.id}"]`);
    card?.classList.remove('selected');
    return;
  }
  if (compareSelection.length >= 2) {
    const removed = compareSelection.shift();
    const removedCard = document.querySelector(`.movie-card[data-movie-id="${removed.id}"]`);
    removedCard?.classList.remove('selected');
  }
  compareSelection.push(movie);
  renderCompareViewPanel();
  const card = document.querySelector(`.movie-card[data-movie-id="${movie.id}"]`);
  card?.classList.add('selected');
}

const originalCreateMovieCard = createMovieCard;
function createMovieCardWithCompare(movie) {
  const html = originalCreateMovieCard(movie);
  return html.replace(
    '</article>',
    `
      <div class="movie-card__actions">
        <button type="button" class="movie-card__compare" data-movie-id="${movie.id}">Ajouter à la comparaison</button>
      </div>
    </article>`
  );
}

function addCompareListeners() {
  document.querySelectorAll('.movie-card__compare').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.movieId);
      const card = btn.closest('.movie-card');
      const favBtn = card?.querySelector('.movie-card__favorite');
      let payload = null;
      if (favBtn?.dataset.movie) {
        try { payload = JSON.parse(decodeURIComponent(favBtn.dataset.movie)); } catch {}
      }
      if (!payload) {
        const title = card?.querySelector('.movie-card__title')?.textContent || '';
        payload = { id, title };
      }
      toggleCompareSelection(payload);
    });
  });
}

export function compareView() {
  app.innerHTML = `
    <section class="compare-layout">
      <div class="compare-layout__panel" id="compare-panel-local" aria-live="polite"></div>
      <div class="compare-layout__grid">
        <div class="compare-layout__toolbar">
          <h1 class="page-title">🎯 Comparateur de films</h1>
          <p>Sélectionnez deux films ci-dessous puis comparez-les à gauche.</p>
        </div>
        <div id="compare-list"></div>
      </div>
    </section>
  `;

  (async () => {
    try {
      const data = await tmdbApi.getPopularMovies();
      const movies = data.results || [];
      const container = document.getElementById('compare-list');
      if (!container) return;
      container.innerHTML = `
        <div class="movies-grid movies-grid--compact">
          ${movies.map(m => createMovieCardWithCompare(m)).join('')}
        </div>
      `;
      addMovieCardListeners();
      addCompareListeners();
      renderCompareViewPanel();
    } catch (err) {
      showError(err.message);
    }
  })();
}

// Ne pas contaminer les autres vues: pas de panneau global, pas de listeners auto en dehors de compareView.
