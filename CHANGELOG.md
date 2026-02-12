# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog.

## [1.0.0] - 2026-02-12
### Added
- Decouverte des films (populaires, recherche, filtres par genre/annee/note/langue).
- Systeme de scoring personnalise avec ponderation (popularite, note, recence).
- Bouton "Surprise Me" dans la page Decouverte pour ouvrir un film aleatoire du top.
- Favoris persistants via localStorage et page "Mes recommandations".
- Page detail avec informations cles (casting, genres, runtime).

### Changed
- Tri des listes par score calcule pour la page Decouverte.
- UI affinee pour l'entete des resultats et les actions rapides.
- Mise a jour de la configuration API pour exiger une cle utilisateur.

### Fixed
- Gestion des posters manquants via un placeholder.
- Valeurs par defaut pour les films sans date ou note.
