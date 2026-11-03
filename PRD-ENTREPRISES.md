# Swipe & Prospect — PRD, 3 novembre 2026

## Problème et objectif
Rémi veut découvrir des entreprises lyonnaises et proposer des candidatures spontanées qui démontrent sa capacité à apporter une contribution pertinente. Le premier résultat à valider est une candidature personnalisée, sourcée et relue, qui propose un échange téléphonique.

## Parcours cible
Une sélection d'environ cinq start-up/PME lyonnaises par jour sur téléphone ; tri rapide garder/passer ; étude successive des profils gardés ; choix de prospecter ; recherche d'un angle adapté et création éventuelle d'une preuve ; rédaction et relecture d'un message ; envoi volontaire depuis Gmail. Faits, sources, hypothèses et inconnues doivent être distincts. Aucune candidature n'est envoyée sans action explicite.

## Première brique livrée
Parcours manuel sur un exemple documenté, Muodim, et fiches ajoutées à la main : tri, lecture, décision, brouillon modifiable et ouverture dans Gmail. Les choix et brouillons restent sur l'appareil et dans le navigateur. L'ouverture de Gmail n'est pas une connexion OAuth, ne crée pas de brouillon à l'avance et n'envoie pas le message. Une connexion internet et une session Gmail sont nécessaires.

## Hypothèses à tester
L'angle proposé est pertinent pour l'entreprise ; l'utilisateur peut créer une preuve convaincante sans travail disproportionné ; le message donne envie d'échanger. Mesures manuelles : temps de préparation, qualité jugée par Rémi, réponses et échanges obtenus.

## Suite par ordre de priorité
1. Tester manuellement plusieurs candidatures, dont Muodim ; affiner la fiche et la façon de choisir une preuve.
2. Ajouter édition et sources structurées, puis stockage privé synchronisé et sauvegarde.
3. Construire la recherche d'entreprises avec sources, filtres et contrôles de qualité, sans assimiler un signal à un besoin.
4. Préparer les éditions quotidiennes après validation de la qualité, du budget et de la cadence.
5. Étudier l'intégration Gmail OAuth et les permissions nécessaires, avec contrôle avant envoi.

## Existant
L'ancien atelier /atelier et l'aperçu /apercu restent disponibles pour consultation. Leur moteur JOAFE, leur modèle et leurs données concernent les associations : ils ne sont pas réutilisés pour présenter des entreprises. Le collecteur, la validation de sources et les diagnostics pourront être évalués avant toute adaptation.

## Hors périmètre du pilote
Envoi automatique, découverte automatique, données synchronisées, recherche IA, scraping, génération automatisée de preuves, notifications et installation PWA.

## Mise à jour — première connexion Annuaire
La recherche à la demande et l’import de fiches officielles dans les cartes sont implémentés. La validation avec des réponses réelles sur l’hébergement reste nécessaire avant de considérer la connexion opérationnelle. Voir `docs/RECHERCHE-ENTREPRISES.md`. L’enrichissement web et la préparation quotidienne restent hors de cette première brique.
