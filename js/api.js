/**
 * Service API TMDB
 * Gère toutes les requêtes vers l'API The Movie Database
 */

import config, { isApiKeyConfigured } from "./config.js";

class TMDBApi {
  constructor() {
    this.baseUrl = config.BASE_URL;
    this.apiKey = config.API_KEY;
    this.language = config.LANGUAGE;
  }

  /**
   * Méthode générique pour effectuer une requête API
   * @param {string} endpoint - L'endpoint à appeler
   * @param {Object} params - Paramètres supplémentaires
   * @returns {Promise<Object>} - Les données de la réponse
   */
  async fetchData(endpoint, params = {}) {
    // Vérifier si la clé API est configurée
    if (!isApiKeyConfigured()) {
      throw new Error(
        "Clé API non configurée. Veuillez ajouter votre clé API dans js/config.js",
      );
    }

    // Construire l'URL avec les paramètres
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("api_key", this.apiKey);
    url.searchParams.append("language", this.language);

    // Ajouter les paramètres supplémentaires
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.status_message || `Erreur HTTP: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Erreur API:", error);
      throw error;
    }
  }

  /**
   * Récupérer les films populaires
   * @param {number} page - Numéro de page
   * @returns {Promise<Object>}
   */
  async getPopularMovies(page = 1) {
    return this.fetchData("/movie/popular", { page });
  }

  /**
   * Découvrir des films avec filtres
   * @param {Object} options - Options de filtrage
   * @returns {Promise<Object>}
   */
  async discoverMovies(options = {}) {
    const params = {
      page: options.page || 1,
      sort_by: options.sortBy || "popularity.desc",
      "vote_average.gte": options.minRating,
      "vote_average.lte": options.maxRating,
      with_genres: options.genres,
      "primary_release_date.gte": options.releaseDateFrom,
      "primary_release_date.lte": options.releaseDateTo,
      year: options.year,
    };

    return this.fetchData("/discover/movie", params);
  }

  /**
   * Rechercher des films
   * @param {string} query - Terme de recherche
   * @param {number} page - Numéro de page
   * @returns {Promise<Object>}
   */
  async searchMovies(query, page = 1) {
    return this.fetchData("/search/movie", { query, page });
  }

  /**
   * Récupérer les détails d'un film
   * @param {number} movieId - ID du film
   * @returns {Promise<Object>}
   */
  async getMovieDetails(movieId) {
    return this.fetchData(`/movie/${movieId}`, {
      append_to_response: "credits,videos,similar",
    });
  }

  /**
   * Récupérer les films les mieux notés
   * @param {number} page - Numéro de page
   * @returns {Promise<Object>}
   */
  async getTopRatedMovies(page = 1) {
    return this.fetchData("/movie/top_rated", { page });
  }

  /**
   * Récupérer les films à venir
   * @param {number} page - Numéro de page
   * @returns {Promise<Object>}
   */
  async getUpcomingMovies(page = 1) {
    return this.fetchData("/movie/upcoming", { page });
  }

  /**
   * Récupérer les films actuellement au cinéma
   * @param {number} page - Numéro de page
   * @returns {Promise<Object>}
   */
  async getNowPlayingMovies(page = 1) {
    return this.fetchData("/movie/now_playing", { page });
  }

  /**
   * Récupérer la liste des genres
   * @returns {Promise<Object>}
   */
  async getGenres() {
    return this.fetchData("/genre/movie/list");
  }

  /**
   * Tester l'authentification API
   * @returns {Promise<Object>}
   */
  async testAuthentication() {
    return this.fetchData("/authentication");
  }
}

// Exporter une instance unique (Singleton)
const tmdbApi = new TMDBApi();
export default tmdbApi;
