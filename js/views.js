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
 * Générer le HTML du panneau de filtres
 * @param {Array} genres - Liste des genres
 * @returns {string} HTML du panneau
 */
function createFiltersPanel(genres) {
  const state = filterState.getState();
  const languages = filterState.getLanguages();

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
                <h2 class="page-title">Films Populaires</h2>
                <div class="movies-grid">
                    ${movies.map((movie) => createMovieCard(movie)).join("")}
                </div>
            </section>
        `;

    addMovieCardListeners();
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
            <div class="movies-grid">
                ${movies.map((movie) => createMovieCard(movie)).join("")}
            </div>
        `;

    addMovieCardListeners();
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

    // Fonction pour charger et afficher les films
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
        const scoredMovies = scoreMovies(data.results);

        if (resultsContainer) {
          if (data.results.length === 0) {
            resultsContainer.innerHTML = createNoResultsMessage();
            // Réattacher l'écouteur du bouton clear
            const clearBtn = document.getElementById("clear-filters-btn");
            if (clearBtn) {
              clearBtn.addEventListener("click", () => {
                filterState.resetFilters();
              });
            }
          } else {
            resultsContainer.innerHTML = `
              <p class="results-count">${data.total_results} film(s) trouvé(s) — triés par score personnalisé</p>
              <div class="movies-grid">
                ${scoredMovies.map((movie) => createMovieCard(movie)).join("")}
              </div>
            `;
            addMovieCardListeners();
          }
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

      // Recharger les films avec les nouveaux filtres
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
    const movie = await tmdbApi.getMovieDetails(movieId);
    const posterUrl = getImageUrl(movie.poster_path, "poster", "large");
    const releaseDate = movie.release_date
      ? new Date(movie.release_date).toLocaleDateString("fr-FR")
      : "Date inconnue";
    const favorite = isFavorite(movie.id);

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
                        <button
                            type="button"
                            class="movie-detail__favorite ${favorite ? "is-favorite" : ""}"
                            aria-pressed="${favorite ? "true" : "false"}"
                            aria-label="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                            title="${favorite ? "Retirer des favoris" : "Ajouter aux favoris"}"
                        >
                            ❤
                        </button>
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
    <p class="results-count">${favorites.length} film(s) en favori</p>
    <div class="movies-grid" data-view="favorites">
      ${favorites.map((movie) => createMovieCard(movie)).join("")}
    </div>
  `;

  addMovieCardListeners();
}
