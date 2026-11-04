# Enrichissement entreprises — 4 novembre 2026

## Utilisation

Ouvrir une fiche → « Enrichir depuis un site ». Renseigner le site officiel et deux pages complémentaires maximum, sur le même domaine : mentions légales, activité ou article précis. Confirmer le site, consulter, relire l’aperçu puis enregistrer. L’instantané web reste séparé des annotations et des données Sirene. Sa mise à jour remplace le précédent instantané web, sans effacer notes, sources personnelles, choix ou brouillons. Annuler abandonne le formulaire ; une navigation avertit si du travail est en cours ou non enregistré.

Titre, court extrait et consultation sont datés. Une publication n’est datée que si une métadonnée d’article exploitable existe. Le contenu du site reste une déclaration à vérifier, jamais une preuve de besoin ou de recrutement. Pas de téléchargement de logo, de recherche automatique d’actualités ou de génération IA. Une actualité doit être fournie par son URL.

Un SIREN/SIRET situé près d’un libellé juridique est comparé à la fiche. Un identifiant différent bloque l’enregistrement, même si un autre correspond. Sans identifiant, le rapprochement reste non confirmé ; le domaine et la confirmation de l’utilisateur ne prouvent pas l’identité. Les fiches sans SIREN ne bénéficient pas du rapprochement.

## Échantillon documenté

« Ajouter » → « Essayer avec trois entreprises documentées » ajoute un cas ou ouvre sa fiche existante sans l’écraser. Sources officielles consultées le 4 novembre 2026, synthèses éditoriales courtes et pistes explicitement hypothétiques. Aucun contact prérempli.

| Cas | Observation | Identité du site | Preuve envisageable, à valider |
|---|---|---|---|
| Muodim, 901931105 | Muographie pour plusieurs domaines d’application | SIREN confirmé antérieurement dans Sirene par Rémi ; mentions légales non retrouvées au cours de ce pilote | Plan pédagogique d’un cas d’usage et mesure |
| ReCom, 791513989 | Prospection B2B et cas client ciblant les façadiers | SIRET dans les mentions légales | Segmentation de prescripteurs et grille de qualification |
| Locabri, 304453160 | Bâtiments démontables acier et métallo-textiles | Numéro de registre dans les mentions légales | Maquette sectorielle et mesure des demandes de devis |

Sources : [Muodim](https://muodim.com/), [ReCom](https://www.re-com.fr/), [mentions ReCom](https://www.re-com.fr/mentions-legales), [Locabri](https://www.locabri.com/fr/), [mentions Locabri](https://www.locabri.com/fr/mentions-legales). La pertinence des pistes de candidature reste à valider avec Rémi. Locabri sert ici de cas connu pour tester une activité différente.

## Societeinfo : évalué, non connecté

La [documentation officielle](https://societeinfo.com/api-doc/) prévoit `GET https://societeinfo.com/app/rest/api/v2/company.json/<SIREN>`, en-tête `X-API-KEY`, un crédit par réponse réussie. Le SIREN connu évite le service de rapprochement « Enrich Company ». Site et logo figurent parmi les champs documentés ; leur disponibilité dans l’offre de Rémi et leur fraîcheur restent inconnues. Les données agrégées ne doivent pas être attribuées au site officiel.

Aucun appel payant ni nouvelle variable requis pour cette brique. Avant connexion : vérifier droits et solde du compte, convenir du plafond de crédits, comparer les trois réponses réelles aux données existantes. Prévoir clé serveur, cache, quota partagé et SIREN concordant. Prix en euros non établi.

## Contrôles et limites

`POST /api/companies/enrich`, JSON de même origine, protection privée existante en production. Transport avec IP publiques validées et épinglées ; réseaux privés, identifiants URL, ports inhabituels, redirections interdomaines et documents non HTML/texte refusés. Limite 3 Mo ; 16 secondes par page, redirections comprises ; trois pages successives, fonction limitée à 60 secondes. Erreurs partielles visibles. Une consultation simultanée par instance, sans quota distribué. Stockage toujours local au navigateur, sans historique des instantanés web.

Validation locale : TypeScript passe, ainsi que les 77 tests, dont huit nouveaux tests d’enrichissement. Tests simulés : extraction, identité et contradictions, URL, réseaux privés, erreurs partielles, route, sauvegarde, actualisation Sirene et conservation des données. Les contrôles ne prouvent pas la disponibilité des sites depuis Vercel.

Sonde reproductible : `node --import tsx scripts/probe-company-enrichment.ts`. Sans clé, elle affiche le statut des trois sites et échoue si une entreprise est entièrement illisible. Dans cet environnement, la consultation web distante fonctionne mais le téléchargement Node échoue en résolution DNS. Les essais réels depuis l’hébergement restent nécessaires. Compilation locale bloquée par les permissions Windows (jonctions Turbopack et création de répertoire webpack) ; captures Chrome non produites. TypeScript et tests vérifiés séparément.

Styles : extension de `pilot.css`, sans nouveau système visuel. La documentation de design historique correspond encore à l’ancien prototype ; aucune remise à plat effectuée.
