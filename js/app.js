/**
 * Point d'entrée de l'application
 * Initialise le router et configure les routes
 */

import router from "./router.js";
import {
  homeView,
  popularView,
  discoverView,
  searchView,
  favoritesView,
  movieDetailView,
  notFoundView,
} from "./views.js";

// Configuration des routes
router
  .addRoute("/", homeView)
  .addRoute("/home", homeView)
  .addRoute("/popular", popularView)
  .addRoute("/discover", discoverView)
  .addRoute("/search", searchView)
  .addRoute("/favorites", favoritesView)
  .addRoute("/movie/:id", movieDetailView)
  .addRoute("/compare", () => import("./views.js").then(m => m.compareView()))
  .setDefaultRoute(notFoundView);

// Message de bienvenue dans la console
console.log(
  "%c🎬 TMDB Explorer",
  "font-size: 24px; font-weight: bold; color: #01b4e4;",
);
console.log("%cApplication initialisée avec succès!", "color: #90cea1;");
console.log(
  "%cN'oubliez pas de configurer votre clé API dans js/config.js",
  "color: #ff6b6b;",
);
