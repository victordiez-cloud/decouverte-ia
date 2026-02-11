/**
 * Vues de l'application
 * Contient les templates HTML pour chaque page
 */

import tmdbApi from "./api.js";
import { getImageUrl, isApiKeyConfigured } from "./config.js";

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

  return `
        <article class="movie-card" data-movie-id="${movie.id}">
            <img 
                src="${posterUrl}" 
                alt="${movie.title}" 
                class="movie-card__poster"
                loading="lazy"
            >
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
    const movies = data.results.slice(0, 8); // Limiter à 8 films pour l'accueil

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

    app.innerHTML = `
            <h1 class="page-title">🔥 Films Populaires</h1>
            <div class="movies-grid">
                ${data.results.map((movie) => createMovieCard(movie)).join("")}
            </div>
        `;

    addMovieCardListeners();
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Vue: Découverte de films
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
    const data = await tmdbApi.discoverMovies({
      sortBy: "popularity.desc",
      minRating: 7,
    });

    app.innerHTML = `
            <h1 class="page-title">🎯 Découverte</h1>
            <p style="text-align: center; margin-bottom: 2rem; color: #666;">
                Films bien notés triés par popularité
            </p>
            <div class="movies-grid">
                ${data.results.map((movie) => createMovieCard(movie)).join("")}
            </div>
        `;

    addMovieCardListeners();
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
                    <h1>${movie.title}</h1>
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
