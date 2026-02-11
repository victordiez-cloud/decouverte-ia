/**
 * Gestion de l'état global des filtres
 * Pattern Observer pour réagir aux changements de filtres
 */

class FilterState {
    constructor() {
        // État initial des filtres
        this.state = {
            genre: '',
            yearMin: '',
            ratingMin: '',
            language: ''
        };
        
        // Liste des observateurs (callbacks)
        this.observers = [];
        
        // Cache des genres et langues
        this.genres = [];
        this.languages = [
            { iso_639_1: 'fr', name: 'Français' },
            { iso_639_1: 'en', name: 'Anglais' },
            { iso_639_1: 'es', name: 'Espagnol' },
            { iso_639_1: 'de', name: 'Allemand' },
            { iso_639_1: 'it', name: 'Italien' },
            { iso_639_1: 'ja', name: 'Japonais' },
            { iso_639_1: 'ko', name: 'Coréen' },
            { iso_639_1: 'zh', name: 'Chinois' },
            { iso_639_1: 'pt', name: 'Portugais' },
            { iso_639_1: 'ru', name: 'Russe' },
            { iso_639_1: 'hi', name: 'Hindi' },
            { iso_639_1: 'ar', name: 'Arabe' }
        ];
    }

    /**
     * Mettre à jour un filtre
     * @param {string} key - La clé du filtre
     * @param {string} value - La nouvelle valeur
     */
    setFilter(key, value) {
        if (this.state.hasOwnProperty(key)) {
            this.state[key] = value;
            this.notifyObservers();
        }
    }

    /**
     * Mettre à jour plusieurs filtres à la fois
     * @param {Object} filters - Les filtres à mettre à jour
     */
    setFilters(filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (this.state.hasOwnProperty(key)) {
                this.state[key] = value;
            }
        });
        this.notifyObservers();
    }

    /**
     * Réinitialiser tous les filtres
     */
    resetFilters() {
        this.state = {
            genre: '',
            yearMin: '',
            ratingMin: '',
            language: ''
        };
        this.notifyObservers();
    }

    /**
     * Obtenir l'état actuel des filtres
     * @returns {Object} L'état des filtres
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Vérifier si des filtres sont actifs
     * @returns {boolean}
     */
    hasActiveFilters() {
        return Object.values(this.state).some(value => value !== '');
    }

    /**
     * Obtenir le nombre de filtres actifs
     * @returns {number}
     */
    getActiveFiltersCount() {
        return Object.values(this.state).filter(value => value !== '').length;
    }

    /**
     * S'abonner aux changements de filtres
     * @param {Function} callback - La fonction à appeler lors d'un changement
     * @returns {Function} Fonction pour se désabonner
     */
    subscribe(callback) {
        this.observers.push(callback);
        // Retourner une fonction pour se désabonner
        return () => {
            this.observers = this.observers.filter(obs => obs !== callback);
        };
    }

    /**
     * Notifier tous les observateurs d'un changement
     */
    notifyObservers() {
        this.observers.forEach(callback => callback(this.state));
    }

    /**
     * Définir la liste des genres disponibles
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
     * Convertir les filtres en paramètres API
     * @returns {Object} Paramètres pour l'API discover
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
}

// Exporter une instance unique (Singleton)
const filterState = new FilterState();
export default filterState;
