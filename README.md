# 🎬 TMDB Explorer

Application web de découverte de films utilisant l'API The Movie Database (TMDB).

## 📋 Prérequis

- Node.js (v16 ou supérieur)
- npm
- Une clé API TMDB (gratuite)

## 🚀 Installation

### 1. Cloner le projet et installer les dépendances

```bash
npm install
```

### 2. Configurer la clé API

1. Créez un compte sur [TMDB](https://www.themoviedb.org/signup)
2. Allez dans les paramètres de votre compte > API
3. Demandez une clé API (choisissez "Developer")
4. Copiez votre clé API
5. Ouvrez `js/config.js` et remplacez `'VOTRE_CLE_API_ICI'` par votre clé

```javascript
API_KEY: 'votre_vraie_cle_api',
```

### 3. Lancer l'application

```bash
# Mode développement (avec hot reload)
npm run dev

# Ou simplement compiler le SASS et lancer le serveur
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 📁 Structure du projet

```
├── index.html          # Page HTML principale
├── scss/
│   └── style.scss      # Styles SASS
├── css/
│   └── style.css       # CSS compilé (généré)
├── js/
│   ├── app.js          # Point d'entrée
│   ├── api.js          # Service API TMDB
│   ├── config.js       # Configuration (clé API)
│   ├── router.js       # Système de routing SPA
│   └── views.js        # Vues/Pages de l'application
├── package.json
└── README.md
```

## 🌿 Gitflow

### Branches principales

- `main` - Branche de production (stable)
- `develop` - Branche de développement

### Branches de travail

- `feature/nom-fonctionnalite` - Nouvelles fonctionnalités
- `bugfix/nom-bug` - Corrections de bugs
- `hotfix/nom-correctif` - Corrections urgentes en production

### Workflow

1. Créer une branche feature depuis develop:
```bash
git checkout develop
git checkout -b feature/ma-fonctionnalite
```

2. Développer et commiter:
```bash
git add .
git commit -m "feat: description de la fonctionnalité"
```

3. Merger dans develop:
```bash
git checkout develop
git merge feature/ma-fonctionnalite
git branch -d feature/ma-fonctionnalite
```

## 🔧 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run sass` | Compile SASS en CSS une fois |
| `npm run sass:watch` | Compile SASS en mode watch |
| `npm start` | Compile et lance le serveur |
| `npm run dev` | Mode développement avec hot reload |
| `npm run build` | Build de production (CSS minifié) |

## 📚 Endpoints API utilisés

| Endpoint | Description |
|----------|-------------|
| `/movie/popular` | Films populaires |
| `/discover/movie` | Découverte avec filtres |
| `/search/movie` | Recherche de films |
| `/movie/{id}` | Détails d'un film |
| `/genre/movie/list` | Liste des genres |

## 🎨 Fonctionnalités

- ✅ Affichage des films populaires
- ✅ Découverte de films
- ✅ Recherche de films
- ✅ Page de détail d'un film
- ✅ Routing SPA (Single Page Application)
- ✅ Design responsive
- ✅ Lazy loading des images

## 👥 Auteurs

Projet réalisé en pair programming.

## 📄 Licence

MIT
