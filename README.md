# Prospection d’associations — V0 privée

Application personnelle de qualification : ciblage versionné, URL/saisie/CSV, collecte de trois pages publiques au maximum, analyse IA configurable, dossier sourcé, brouillon éditable, versions précédentes, prévisualisation et e-mail de test vers une adresse personnelle unique.

## Démarrer

```sh
npm install
npm run dev
```

Ouvrir http://127.0.0.1:3000. En local, SQLite conserve les données dans `.data/prospection.db`. Sur Vercel, configurer Turso et le mot de passe privé selon [CONFIGURATION.md](CONFIGURATION.md). Les données locales ne sont pas transférées automatiquement vers Turso.

## Services et limites actuelles

La collecte, l’édition, les versions, la prévisualisation et le téléchargement sont utilisables. Les adaptateurs IA et SMTP sont implémentés et testés avec des réponses simulées. Aucun fournisseur ni identifiant n’a été configuré : l’analyse réelle et la réception d’un premier e-mail doivent encore être vérifiées après configuration. Voir [CONFIGURATION.md](CONFIGURATION.md).

## Utiliser

1. Enregistrer le ciblage et votre offre.
2. Ajouter une association puis ouvrir sa fiche dans l’historique.
3. Indiquer jusqu’à trois URL et, si utile, des informations manuelles. Cliquer sur « Collecter ces sources ».
4. Consulter les textes et erreurs ; lorsque le fournisseur IA est configuré, cliquer sur « Préparer la fiche avec l’IA ».
5. Vérifier les sources, corriger le brouillon et l’enregistrer. La précédente version reste consultable et téléchargeable.
6. Prévisualiser le dossier. Le télécharger ou, après configuration SMTP, l’envoyer à l’adresse personnelle affichée.
7. Confirmer la réception effective avec « J’ai reçu ce dossier ».

Un nouveau test avec le ciblage actuel garde l’ancien test. Une nouvelle analyse de la même fiche conserve ses versions. Les e-mails envoyés gardent le contenu exact de leur prévisualisation. Aucune découverte quotidienne ni prise de contact avec les associations n’est exécutée.

## Vérifier

```sh
npm run typecheck
npm test
npm run build
```

Les tests couvrent sources et coordonnées inventées, réseau privé, origine des écritures, versions, concurrence, états interrompus, prévisualisation périmée, destinataire unique, double clic, reprise et confirmation de réception. Le test de livraison utilise un transport simulé ; il ne prouve pas une réception SMTP réelle.

[Critères d’acceptation](ACCEPTATION-V0.md) · [Configuration](CONFIGURATION.md) · [PRD](PRD.md) · [Architecture](ARCHITECTURE.md) · [Pilote](PILOTE.md)

Le [deuxième pilote](PILOTE.md#deuxième-pilote--méthode-à-deux-axes-29-septembre-2026) ajoute six fiches consultables avec deux axes qualitatifs, preuves et inconnus, sous le ciblage version 4.
