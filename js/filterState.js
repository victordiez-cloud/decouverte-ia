/**
 * Gestion de l'etat global des filtres
 * Pattern Observer pour reagir aux changements de filtres
 */

class FilterState {
  constructor() {
    this.defaultWeights = {
      weightPopularity: 34,
      weightRating: 33,
      weightRecency: 33,
    };

    // Etat initial des filtres
    this.state = {
      genre: "",
      yearMin: "",
      ratingMin: "",
      language: "",
      ...this.defaultWeights,
    };

    // Liste des observateurs (callbacks)
    this.observers = [];

    // Cache des genres et langues
    this.genres = [];
    this.languages = [
      { iso_639_1: "fr", name: "Francais" },
      { iso_639_1: "en", name: "Anglais" },
      { iso_639_1: "es", name: "Espagnol" },
      { iso_639_1: "de", name: "Allemand" },
      { iso_639_1: "it", name: "Italien" },
      { iso_639_1: "ja", name: "Japonais" },
      { iso_639_1: "ko", name: "Coreen" },
      { iso_639_1: "zh", name: "Chinois" },
      { iso_639_1: "pt", name: "Portugais" },
      { iso_639_1: "ru", name: "Russe" },
      { iso_639_1: "hi", name: "Hindi" },
      { iso_639_1: "ar", name: "Arabe" },
    ];
  }

  /**
   * Mettre a jour un filtre
   * @param {string} key - La cle du filtre
   * @param {string|number} value - La nouvelle valeur
   */
  setFilter(key, value) {
    if (this.state.hasOwnProperty(key)) {
      if (key.startsWith("weight")) {
        const parsed = Number.parseInt(value, 10);
        this.state[key] = Number.isNaN(parsed)
          ? 0
          : Math.max(0, Math.min(100, parsed));
      } else {
        this.state[key] = value;
      }

      this.notifyObservers(key);
    }
  }

  /**
   * Mettre a jour plusieurs filtres a la fois
   * @param {Object} filters - Les filtres a mettre a jour
   */
  setFilters(filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (this.state.hasOwnProperty(key)) {
        if (key.startsWith("weight")) {
          const parsed = Number.parseInt(value, 10);
          this.state[key] = Number.isNaN(parsed)
            ? 0
            : Math.max(0, Math.min(100, parsed));
        } else {
          this.state[key] = value;
        }
      }
    });
    this.notifyObservers("bulk");
  }

  /**
   * Reinitialiser tous les filtres
   */
  resetFilters() {
    this.state = {
      genre: "",
      yearMin: "",
      ratingMin: "",
      language: "",
      ...this.defaultWeights,
    };
    this.notifyObservers("reset");
  }

  /**
   * Obtenir l'etat actuel des filtres
   * @returns {Object} L'etat des filtres
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Verifier si des filtres API sont actifs
   * @returns {boolean}
   */
  hasActiveFilters() {
    return ["genre", "yearMin", "ratingMin", "language"].some(
      (key) => this.state[key] !== "",
    );
  }

  /**
   * Obtenir le nombre de filtres API actifs
   * @returns {number}
   */
  getActiveFiltersCount() {
    return ["genre", "yearMin", "ratingMin", "language"].filter(
      (key) => this.state[key] !== "",
    ).length;
  }

  /**
   * S'abonner aux changements de filtres
   * @param {Function} callback - La fonction appelee lors d'un changement
   * @returns {Function} Fonction pour se desabonner
   */
  subscribe(callback) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== callback);
    };
  }

  /**
   * Notifier tous les observateurs d'un changement
   * @param {string|null} changedKey - Cle du filtre modifie
   */
  notifyObservers(changedKey = null) {
    this.observers.forEach((callback) => callback(this.state, { changedKey }));
  }

  /**
   * Definir la liste des genres disponibles
   * @param {Array} genres - Liste des genres
   */
  setGenres(genres) {
    this.genres = genres;
  }

  /**
   * Obtenir la liste des genres
   * @returns {Array}
   */
  getGenres() {
    return this.genres;
  }

  /**
   * Obtenir la liste des langues
   * @returns {Array}
   */
  getLanguages() {
    return this.languages;
  }

  /**
   * Convertir les filtres en parametres API
   * @returns {Object} Parametres pour l'API discover
   */
  toApiParams() {
    const params = {};

    if (this.state.genre) {
      params.genres = this.state.genre;
    }

    if (this.state.yearMin) {
      params.releaseDateFrom = `${this.state.yearMin}-01-01`;
    }

    if (this.state.ratingMin) {
      params.minRating = parseFloat(this.state.ratingMin);
    }

    if (this.state.language) {
      params.language = this.state.language;
    }

    return params;
  }

  /**
   * Obtenir les poids de score courants
   * @returns {{weightPopularity: number, weightRating: number, weightRecency: number}}
   */
  getWeights() {
    return {
      weightPopularity: this.state.weightPopularity,
      weightRating: this.state.weightRating,
      weightRecency: this.state.weightRecency,
    };
  }

  /**
   * Obtenir les poids normalises (somme = 1)
   * @returns {{popularity: number, rating: number, recency: number}}
   */
  getNormalizedWeights() {
    const { weightPopularity, weightRating, weightRecency } = this.getWeights();
    const total = weightPopularity + weightRating + weightRecency;

    if (total === 0) {
      return { popularity: 1 / 3, rating: 1 / 3, recency: 1 / 3 };
    }

    return {
      popularity: weightPopularity / total,
      rating: weightRating / total,
      recency: weightRecency / total,
    };
  }
}

// Exporter une instance unique (Singleton)
const filterState = new FilterState();
export default filterState;
