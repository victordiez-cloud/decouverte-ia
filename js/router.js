/**
 * Système de Routing SPA (Single Page Application)
 * Gère la navigation entre les différentes vues de l'application
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        
        // Écouter les changements d'URL
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    /**
     * Enregistrer une nouvelle route
     * @param {string} path - Le chemin de la route (ex: '/home')
     * @param {Function} handler - La fonction à exécuter pour cette route
     */
    addRoute(path, handler) {
        this.routes[path] = handler;
        return this; // Permet le chaînage
    }

    /**
     * Définir une route par défaut (404 ou accueil)
     * @param {Function} handler - La fonction à exécuter par défaut
     */
    setDefaultRoute(handler) {
        this.defaultRoute = handler;
        return this;
    }

    /**
     * Naviguer vers une route spécifique
     * @param {string} path - Le chemin vers lequel naviguer
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Gérer le changement de route
     */
    handleRoute() {
        // Récupérer le hash actuel (sans le #)
        let hash = window.location.hash.slice(1) || '/';
        
        // Extraire le chemin de base et les paramètres
        const [path, ...params] = hash.split('/').filter(Boolean);
        const routePath = '/' + (path || '');
        
        // Mettre à jour les liens actifs dans la navigation
        this.updateActiveLinks(routePath);

        // Chercher la route correspondante
        let handler = this.routes[routePath];
        let routeParams = params;

        // Si pas de route exacte, chercher une route avec paramètres
        if (!handler) {
            for (const [route, routeHandler] of Object.entries(this.routes)) {
                if (route.includes(':')) {
                    const routeParts = route.split('/').filter(Boolean);
                    const hashParts = hash.split('/').filter(Boolean);
                    
                    if (routeParts.length === hashParts.length) {
                        const match = routeParts.every((part, index) => {
                            return part.startsWith(':') || part === hashParts[index];
                        });
                        
                        if (match) {
                            handler = routeHandler;
                            routeParams = hashParts.slice(routeParts.findIndex(p => p.startsWith(':')));
                            break;
                        }
                    }
                }
            }
        }

        // Exécuter le handler approprié
        if (handler) {
            this.currentRoute = routePath;
            handler(...routeParams);
        } else if (this.defaultRoute) {
            this.currentRoute = null;
            this.defaultRoute();
        }
    }

    /**
     * Mettre à jour les liens actifs dans la navigation
     * @param {string} currentPath - Le chemin actuel
     */
    updateActiveLinks(currentPath) {
        document.querySelectorAll('.nav__link').forEach(link => {
            const linkPath = '/' + (link.dataset.route || '');
            if (linkPath === currentPath || 
                (currentPath === '/' && link.dataset.route === 'home')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Obtenir la route actuelle
     * @returns {string} Le chemin actuel
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
}

// Exporter une instance unique
const router = new Router();
export default router;
