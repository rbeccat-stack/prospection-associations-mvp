# TODO — Prospection d’associations

**État :** fonctions V0 implémentées le 28 septembre 2026. Collecte et édition utilisables ; activation et validation réelles des services IA/SMTP encore attendues. Voir `ACCEPTATION-V0.md`.
**Règle de passage :** l’accord reçu couvre l’application locale et ses dépendances. Il ne couvre ni connexion à un fournisseur IA/e-mail, ni envoi externe.

## Prochaines décisions

- [x] Obtenir l’accord explicite pour démarrer la brique 0A.
- [ ] Relire et valider le [PRD](PRD.md) avant d’étendre le périmètre au dossier sourcé.
- [ ] Confirmer si l’usage restera strictement local ou s’il faudra un accès hébergé ; SQLite et l’absence de compte sont des choix provisoires documentés dans `ARCHITECTURE.md`.

## Brique 0A — Fondations locales, terminée

- [x] Documenter l’architecture locale provisoire dans `ARCHITECTURE.md`.
- [x] Créer le projet Next.js + TypeScript et une configuration d’exemple sans secrets ; vérifier qu’il démarre sur `127.0.0.1`.
- [x] Définir les schémas de critères, entrée, source, affirmation, dossier et brouillon ; rejeter les valeurs invalides.
- [x] Ajouter les critères et une entrée manuelle URL/CSV/saisie ; figer la version du ciblage pour chaque test.
- [x] Ajouter l’historique et l’avertissement de doublon ; permettre un nouveau test explicite sans effacer l’ancien.
- [x] Vérifier le typecheck, 4 tests de fondation, la compilation et le parcours local dans le navigateur.

## Brique 0B — Dossier sourcé, après choix des données et accord sur les connexions nécessaires

- [x] Préparer une première fiche manuelle Artis MBC à partir du site officiel ; relier faits, contacts, signaux, critères et brouillon aux sources.
- [x] Afficher ce dossier dans la fiche du test existant, sans modifier sa saisie initiale ni envoyer de message.
- [x] Choisir encore 2 associations et élargir les critères d’essai ; noter les sources utilisables et les résultats attendus dans `PILOTE.md`.
- [ ] Recueillir le jugement de l’utilisateur sur l’utilité et la vérifiabilité d’au moins 2 des 3 fiches.
- [x] Ajouter une collecte limitée aux URL explicitement fournies, avec erreurs et refus du réseau privé.
- [ ] Choisir et autoriser le fournisseur IA, son traitement des données et un plafond de coût avant tout appel externe.
- [x] Valider le JSON du dossier manuel ; rejeter les références de sources inconnues et les contacts non sourcés.
- [x] Construire le parcours répétable et l’éditeur de brouillon avec versions ; adaptateur IA à activer avant validation de la génération réelle.

## Brique 0C — Livraison du dossier de test, après choix et accord explicite

- [ ] Configurer côté serveur l’adresse personnelle autorisée et l’identité d’expéditeur, sans les publier dans le dépôt.
- [ ] Choisir et autoriser un fournisseur d’e-mail transactionnel avant connexion.
- [x] Ajouter prévisualisation, envoi manuel, destinataire unique, double clic, reprise contrôlée et confirmation de réception.
- [ ] Vérifier l’e-mail réellement reçu, ses sources, ses réserves et son brouillon ; consigner les échecs et la réponse du fournisseur séparément.
- [x] Documenter les 12 critères dans `ACCEPTATION-V0.md`, y compris les vérifications externes encore manquantes.

## Ensuite

- [ ] MVP 1 : décisions de revue, motifs de rejet structurés et historique des corrections.
- [ ] MVP 2 : découverte quotidienne, sélection de `X`, heure `Y`, dédoublonnage et notification.
- [ ] MVP 3 : préparation des actions de contact avec validation humaine explicite et contrôles adaptés.
