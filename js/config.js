/**
 * Configuration de l'API TMDB
 *
 * IMPORTANT: Ne jamais commiter votre clé API dans un repository public!
 * Pour la production, utilisez des variables d'environnement.
 */

const config = {
  // Clé API TMDB - Remplacez par votre propre clé
  // Obtenez votre clé sur: https://www.themoviedb.org/settings/api
  API_KEY: "d601eb629ac424f6f0c3bdd3050037f9",

  // URL de base de l'API
  BASE_URL: "https://api.themoviedb.org/3",

  // URL de base pour les images
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",

  // Tailles d'images disponibles
  IMAGE_SIZES: {
    poster: {
      small: "w185",
      medium: "w342",
      large: "w500",
      original: "original",
    },
    backdrop: {
      small: "w300",
      medium: "w780",
      large: "w1280",
      original: "original",
    },
  },

  // Langue par défaut
  LANGUAGE: "fr-FR",

  // Région par défaut
  REGION: "FR",
};

// Fonction pour obtenir l'URL complète d'une image
export function getImageUrl(path, type = "poster", size = "medium") {
  if (!path) {
    return "https://via.placeholder.com/500x750?text=No+Image";
  }
  const imageSize =
    config.IMAGE_SIZES[type][size] || config.IMAGE_SIZES.poster.medium;
  return `${config.IMAGE_BASE_URL}/${imageSize}${path}`;
}

// Fonction pour vérifier si la clé API est configurée
export function isApiKeyConfigured() {
  return config.API_KEY && config.API_KEY !== "VOTRE_CLE_API_ICI";
}

export default config;
