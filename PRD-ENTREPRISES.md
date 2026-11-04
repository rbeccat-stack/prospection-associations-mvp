# Swipe & Prospect — PRD, 3 novembre 2026

## Problème et objectif
Rémi veut découvrir des entreprises lyonnaises et proposer des candidatures spontanées qui démontrent sa capacité à apporter une contribution pertinente. Le premier résultat à valider est une candidature personnalisée, sourcée et relue, qui propose un échange téléphonique.

## Parcours cible
Une sélection d'environ cinq start-up/PME lyonnaises par jour sur téléphone ; tri rapide garder/passer ; étude successive des profils gardés ; choix de prospecter ; recherche d'un angle adapté et création éventuelle d'une preuve ; rédaction et relecture d'un message ; envoi volontaire depuis Gmail. Faits, sources, hypothèses et inconnues doivent être distincts. Aucune candidature n'est envoyée sans action explicite.

## Première brique livrée
Parcours manuel sur un exemple documenté, Muodim, et fiches ajoutées à la main : tri, lecture, décision, brouillon modifiable et ouverture dans Gmail. Les choix et brouillons restent sur l'appareil et dans le navigateur. L'ouverture de Gmail n'est pas une connexion OAuth, ne crée pas de brouillon à l'avance et n'envoie pas le message. Une connexion internet et une session Gmail sont nécessaires.

## Hypothèses à tester
L'angle proposé est pertinent pour l'entreprise ; l'utilisateur peut créer une preuve convaincante sans travail disproportionné ; le message donne envie d'échanger. Mesures manuelles : temps de préparation, qualité jugée par Rémi, réponses et échanges obtenus.

## Plan actuel — 4 novembre 2026
1. Recherche Sirene 3.11 : connexion et recherche multicritère opérationnelles selon les essais confirmés par Rémi.
2. Qualité des résultats : contrôles des critères sur les réponses, dédoublonnage, pagination ordonnée/bornée, inconnus et exclusions explicités ; tests automatisés sur réponses simulées.
3. Fiches entreprises : édition, sources structurées, notes et distinction faits/hypothèses/données officielles ; actualisation Sirene sans écraser les annotations ou brouillons. Stockage encore local au navigateur, avec reprise des profils existants.
4. Enrichissement : évaluer les sources web et Societeinfo sur un petit échantillon, avec traçabilité et validation de l’angle de candidature.
5. Stockage privé synchronisé et sauvegarde avant un usage régulier entre téléphone et ordinateur.
6. Préparer les éditions quotidiennes après validation de la qualité, du budget et de la cadence.
7. Étudier l'intégration Gmail OAuth et les permissions nécessaires, avec contrôle avant envoi.

## Existant
L'ancien atelier /atelier et le prototype /apercu/index.html restent disponibles pour consultation ; /apercu redirige vers l’application actuelle. Leur moteur JOAFE, leur modèle et leurs données concernent les associations : ils ne sont pas réutilisés pour présenter des entreprises. Le collecteur, la validation de sources et les diagnostics pourront être évalués avant toute adaptation.

## Hors périmètre du pilote
Envoi automatique, découverte automatique, données synchronisées, recherche IA, scraping, génération automatisée de preuves, notifications et installation PWA.

## Mise à jour — connexion Sirene
La recherche à la demande et l’import de fiches officielles utilisent désormais l’API Sirene 3.11 de l’Insee. Rémi a confirmé les essais Muodim et Rhône / Construction / 10–49 salariés après correction des requêtes. Voir `docs/RECHERCHE-ENTREPRISES.md` pour les contrôles ajoutés et les limites des tests. L’enrichissement web et la préparation quotidienne restent à développer.

## Source d’enrichissement à prévoir : Societeinfo

Rémi dispose également d’une API Societeinfo et souhaite l’utiliser dans une étape ultérieure. Elle n’est pas encore connectée.

Après validation de la recherche Sirene, examiner les champs disponibles dans son offre, les conditions d’utilisation, les quotas et le coût réel. Comparer sa couverture et sa fraîcheur aux données Sirene sur un petit échantillon d’entreprises connues. Si l’essai est concluant, prévoir un enrichissement facultatif depuis le serveur, avec la clé conservée dans les variables d’environnement et un rapprochement par SIREN vérifié. Afficher la source et la date des informations ; ne pas remplacer silencieusement des données contradictoires ni considérer une hypothèse comme un fait.

L’intégration et tout appel payant seront à définir au moment de cette étape. Sirene reste la première brique pour la recherche.
