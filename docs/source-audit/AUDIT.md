# Audit des sources — Swipe & Prospect

Date : 3 novembre 2026. Périmètre : faisabilité des sources, sans connexion de nouveaux fournisseurs ni changement du produit.

## Conclusion
L'API Recherche d'entreprises reste le candidat principal pour constituer des listes. Le site officiel et les actualités de l'entreprise permettent de comprendre l'activité. BODACC est un complément administratif. Aucune de ces intégrations nouvelles n'est validée de bout en bout dans l'application lors de cet audit : le réseau sortant du processus de test est refusé (EACCES).

## Preuves et portée des tests
- Script exécuté : `node --import tsx scripts/audit-sources.mts`.
- Résultats bruts : `docs/source-audit/probes.json`.
- Dix requêtes HTTP serveur (identité, filtrage, BODACC, sites et robots) : toutes refusées localement avec EACCES avant réponse HTTP. Ni indisponibilité du fournisseur, ni refus de ses conditions, ni erreur HTTP 403.
- Consultation distante de pages publiques via l'outil de recherche : contenu accessible pour Muodim, Lyon Start Up, Les Pépites Tech, actualités et recrutements PULSALYS. Cela prouve une lisibilité via cet intermédiaire, pas la compatibilité avec notre collecteur Node ni une disponibilité en production.
- Un CSV synthétique contenant Muodim a été accepté par le parseur existant. C'est une vérification locale effective, pas un import connecté au nouveau pilote.
- Aucun compte créé, aucun achat, aucune requête d'enrichissement payante et aucun envoi de données personnelles à un fournisseur.

## Matrice

| Source | Test / résultat concret | Intégration envisageable | Verdict |
|---|---|---|---|
| API Recherche d'entreprises | Requête SIREN 901931105 et filtres Lyon 3e + effectif : EACCES. Documentation officielle consultée. | Appels serveur JSON ; SIREN de référence, distinction siège/établissement, effectif et année, valeurs inconnues. Pagination et filtres à vérifier réellement. | Prioritaire, accès documenté, exécution non validée. |
| API Sirene directe | Documentation INSEE examinée ; aucun appel authentifié effectué. | Option pour extractions plus larges, avec modalités d'accès et limites du catalogue courant. | Option, pas testée opérationnellement. |
| Site Muodim | Page lue à distance : offre, applications, rôles de l'équipe. Fetch serveur et robots.txt : EACCES. | Collecte bornée du site sélectionné, références par page et erreurs visibles. Ne pas assimiler les membres affichés à un effectif salarié officiel. | Bon candidat pour enrichissement, compatibilité collecteur à tester. |
| Lyon Start Up | Liste distante lisible : noms, descriptions, secteurs, liens ; fiche Abel.io accessible une fois, indisponible au second accès distant. Mentions légales demandent autorisation écrite préalable pour reproduction des contenus. | Liens de découverte et vérification auprès du site officiel/SIREN. Éventuel flux autorisé par l'éditeur. | Pas de copie automatique des fiches à activer sur cette seule base. |
| Les Pépites Tech / French Tech local | Liste distante lisible, descriptions et images. Conditions : autorisation préalable pour copie des contenus, usage privé, restrictions commerciales. Données de registre reprises de l'API publique. | Découverte par liens ; identité à récupérer directement à la source publique ; demander un mode d'accès convenu avant copie récurrente. | Pas validé comme annuaire à scraper automatiquement. |
| Actualités PULSALYS | Article Muodim accessible, publication du 17 juillet 2026 relatant l'annonce du 7 juillet 2026. | URL, titre, date de publication ET date de l'événement, extrait bref et fait sourcé. Pas de copie intégrale des articles. Autres médias à qualifier individuellement. | Utile pour signaux ; pas une validation de toute la presse. |
| Offres d'emploi publiques / PULSALYS | Page distante lisible avec postes, entreprises, contrats et liens. Ne démontre pas que les annonces restent ouvertes. | Collecte ciblée, date de consultation, date de publication et vérification de validité sur la page de détail. | Source complémentaire candidate, pas connectée. |
| API offres France Travail | Fiche officielle du catalogue indique API plus exposée en libre accès, accès restreint et demande par formulaire. | Accès accordé par le fournisseur avant test authentifié. | Ne pas prévoir comme connexion gratuite immédiate. |
| BODACC | Accès gratuit et JSON/CSV documentés, licence ouverte et CGU ; test serveur filtré Muodim bloqué localement. Ouverture distante de l'endpoint JSON également non concluante. | Appels serveur par SIREN, interprétation du type d'annonce, distinction date de publication/jugement/événement. | Bon complément documenté ; données réelles non validées ici. |
| Recherche web / Brave | Recherche interactive effectivement utilisée dans l'audit. Documentation API Brave consultée : clé et offre requises pour l'intégration habituelle. Aucun appel authentifié effectué. | Fournisseur de recherche serveur à configurer ; score d'identification du site, homonymies, source exacte. Le moteur de ChatGPT ne devient pas automatiquement une API de l'application. | Intégrable sous conditions, non testé en API. |
| LinkedIn | Conditions officielles consultées : interdiction des outils de scraping/copie. Aucun scraping de profils ou session privée tenté. | Lien à ouvrir manuellement ; API officiellement autorisée si un cas d'usage et accès adéquats existent. | Ne pas en faire un collecteur automatique de profils/publications. |
| Pappers | Documentation API et modèle de crédits consultés. Clé nécessaire. Aucun crédit ni compte utilisé. | Adaptateur serveur optionnel, budget et champs utiles à définir. | Possible avec compte ; qualité des réponses non testée. |
| Dropcontact | Documentation officielle consultée : jeton X-Access-Token, enrichissement asynchrone et récupération par identifiant. Aucun contact transmis ni appel payant effectué. | Après identification de la bonne personne, requête serveur et suivi d'état ; ne découvre pas automatiquement le bon destinataire pour nous. | Possible avec compte ; précision/coût réel non testés. |
| Notes et CSV personnels | Parseur existant testé sur une ligne d'entreprise synthétique. Lecture du code : colonnes strictes, 1–10 lignes, virgules, 25 Ko ; le point-virgule Excel n'est pas configuré. | Import à adapter aux entreprises, dédoublonnage SIREN, édition et traçabilité. | Utilisable comme brique, absent du nouveau parcours pour le moment. |
| BOAMP / commande publique | Documentation BOAMP consultée : API gratuite, formats structurés, licence ouverte. Aucun appel de données exécuté. | Identifier des projets/acteurs avec lien métier démontré, puis rapprochement SIREN. | Secondaire, pas testé opérationnellement. |

## Ce que l'existant permet et ce qui manque
Le collecteur contient déjà contrôle des adresses publiques, délais, limite de texte, extraction HTML, liens mailto/tel et traces de sources. Il ne prouve pas l'identité d'un site trouvé par recherche et ne gère pas les contenus nécessitant JavaScript. Il retire SVG/scripts et coupe le texte à 18 000 caractères : un logo ou une actualité en bas de page peut disparaître. Il ne constitue pas une gestion complète des permissions/robots/licences. Le moteur de découverte actuel force encore `est_association=true` ; il ne constitue donc pas le moteur entreprises voulu.

Les réponses du futur moteur doivent conserver SIREN/SIRET, URL et date de consultation, valeur manquante explicite, date de publication/événement, provenance de chaque signal. Un logo trouvé n'est pas automatiquement réutilisable ; aucune licence générale des images n'a été validée. Une monogramme de secours évite de bloquer la fiche.

## Prochaine validation nécessaire, avant intégration
Exécuter les sondes sur un environnement serveur autorisant ces connexions. Pour les API ouvertes : obtenir et vérifier un vrai JSON, l'identité Muodim, 2 pages sans doublons, la géographie par établissement, les champs manquants et les réponses 429. Pour le web : comparer extraction de plusieurs pages par entreprise, liens de contact, fraîcheur des faits et blocages JavaScript. Les sondes ne testent ni la pagination complète ni les doublons ni la pertinence métier : elles servent au diagnostic d'accès.

Pour les annuaires à conditions restrictives : rester sur liens/import manuel de ses propres notes ou obtenir une autorisation/un flux. Pour les services à clé : choisir le fournisseur et son budget avant test authentifié. Aucune source ne doit être marquée « opérationnelle » tant que ces points restent ouverts.

## Références consultées
- https://recherche-entreprises.api.gouv.fr/docs/
- https://www.insee.fr/fr/information/9019311
- https://muodim.com/
- https://lyonstartup.com/start-up
- https://lyonstartup.com/start-up/abel-io
- https://www.lyonstartup.com/mentions
- https://lespepitestech.com/french-tech-hub/french-tech-one-lyon-saint-etienne
- https://lespepitestech.com/content/conditions-generales-dutilisation
- https://www.pulsalys.fr/article/muodim-ouvre-son-capital-brgm-invest-et-iris-instruments-pour-accelerer-la-democratisation
- https://www.pulsalys.fr/article/rejoignez-laventure-pulsalys
- https://www.data.gouv.fr/dataservices/api-offres-demploi
- https://www.data.gouv.fr/dataservices/api-bulletin-officiel-des-annonces-civiles-et-commerciales-bodacc
- https://api-dashboard.search.brave.com/documentation/guides/authentication
- https://pc.linkedin.com/legal/user-agreement
- https://www.pappers.fr/api
- https://www.pappers.fr/api/documentation
- https://developer.dropcontact.com/
- https://www.data.gouv.fr/dataservices/api-bulletin-officiel-des-annonces-des-marches-publics-boamp
