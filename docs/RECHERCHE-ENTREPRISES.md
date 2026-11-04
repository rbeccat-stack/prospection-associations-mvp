# Recherche d’entreprises via l’API Sirene 3.11

La nouvelle recherche utilise `https://api.insee.fr/api-sirene/3.11/siret`, et non l’API Recherche d’entreprises. Les fiches externes de consultation restent des liens vers l’Annuaire ; elles ne servent pas à obtenir les résultats.

## Configuration

Créer une application sur le portail API de l’Insee, souscrire à l’API Sirene ouverte et générer sa clé d’intégration. Sur Vercel, dans le projet, Settings > Environment Variables, ajouter `API_KEY_SIRENE` avec la clé, pour l’environnement Production. Ne pas ajouter le préfixe `NEXT_PUBLIC_` et ne pas placer la clé dans un fichier versionné. Relancer un déploiement après changement de variable. En local, ajouter `API_KEY_SIRENE=...` à `.env.local` puis redémarrer le serveur.

Le serveur passe la clé dans l’en-tête `X-INSEE-Api-Key-Integration`. Elle n’est ni dans l’URL, ni dans les données retournées au navigateur. Une clé absente ou refusée produit un message explicite ; aucune réponse fictive n’est utilisée.

## Fonctionnement et limites

Une recherche correspond à une requête `/siret` (10 établissements par page, pagination `debut`, `tri=true`, 100 pages maximum). Un avertissement indique lorsque seuls les 1 000 premiers établissements sont accessibles. Le tri stabilise l’ordre des scores identiques ; le répertoire peut toutefois changer entre deux requêtes. L’API compte les établissements ; le système retire les doublons SIREN dans chaque page et à l’ajout aux cartes. Des doublons peuvent réapparaître entre pages ; le total n’est pas un nombre d’entreprises uniques. L’adresse est celle de l’établissement retourné ; elle n’est identifiée comme siège que si `etablissementSiege` le confirme. Les éléments masqués `[ND]` et l’adresse d’une unité à diffusion partielle ne sont pas affichés.

Filtres : dénomination officielle, zone (neuf codes postaux lyonnais / Rhône / France), sections d’activité et tranches d’effectifs de l’unité légale. Les inconnus sont conservés si aucun filtre d’effectif n’est choisi ; ils sont exclus par le filtre. Les sections sont traduites en préfixes NAF rév. 2 ; l’Insee prévoit le changement vers NAF 2025 en janvier 2027 et cette traduction devra être adaptée. La recherche par identifiant ignore volontairement les autres filtres. Les entreprises individuelles dont l’identité est masquée ne sont pas affichées. Les catégories hors 1xxx–6xxx et les associations sont écartées ; ce n’est pas une liste exhaustive de toutes les unités du répertoire.

Le serveur vérifie également les critères géographiques, APE et effectif sur les réponses reçues, ainsi que la cohérence SIREN/SIRET et l’identifiant demandé en recherche directe. Le nombre de résultats écartés distingue doublons, entités inactives/hors périmètre, critères non respectés et identité inexploitable. Les valeurs absentes restent explicitement inconnues, avec avertissements dans les fiches. Une page vide après ces contrôles peut être suivie d’autres pages.

## Fiches et enrichissement manuel

Depuis une carte à découvrir ou la sélection, « Modifier la fiche » permet de renseigner description, activité, localisation, email à vérifier, faits/signaux, hypothèses et notes personnelles. Les sources sont structurées (titre, URL web, date de consultation facultative). Enregistrer applique les changements ; Annuler les abandonne. Une navigation qui quitterait des modifications non enregistrées demande confirmation.

Les données officielles Sirene sont présentées dans un bloc séparé avec leur date de consultation. Le bouton « Actualiser les données Sirene » réutilise le résultat de recherche déjà reçu : aucun nouvel appel API n’est déclenché par le bouton. Il remplace cet instantané dans la fiche existante, identifiée par SIREN, en préservant libellés personnels, sources, notes, choix et brouillons. Il n’effectue pas d’enrichissement web. Les résultats de recherche sont conservés lors de la navigation entre onglets jusqu’au rechargement de l’application.

Le stockage reste local au navigateur (`swipe-prospect-entreprises-v1`), sans synchronisation entre appareils. Les profils du premier pilote sont relus et leurs anciennes sources converties. Une sélection illisible n’est remplacée qu’après tentative de copie de récupération locale ; si cette copie échoue, les écritures sont désactivées pour ne pas écraser l’original. Un stockage indisponible ou plein est signalé. Societeinfo et Gmail OAuth restent des étapes ultérieures.

## Quota et erreurs

L’accès public est limité par l’Insee à 30 requêtes par minute. En plus du contrôle fournisseur, le serveur limite chaque instance à 25 requêtes sur 60 secondes, sans relance automatique, et transmet `Retry-After` si disponible. Cette limite en mémoire ne coordonne pas plusieurs instances serverless : elle ne garantit pas un quota global si plusieurs instances ou applications partagent une clé. Pour un usage soutenu ou multi-instance, ajouter un compteur partagé atomique avant d’élargir l’usage.

## Vérification

Le 4 novembre 2026, la suite locale compte 69 tests réussis et la vérification TypeScript passe. Les tests Sirene utilisent des réponses simulées : toutes les combinaisons de filtres sont vérifiées pour la construction des requêtes/pagination ; des réponses ciblées couvrent contrôles des critères, données manquantes, exclusions, quota et erreurs. Les tests de fiches couvrent migration, édition, suppression de sources, import répété et préservation des notes, choix et brouillons.

Rémi a confirmé le fonctionnement réel de la recherche Muodim (SIREN 901931105), puis de la combinaison Rhône / Construction / 10–49 après correction de la portée des champs dans `q`. La nouvelle matrice de tests ne constitue pas un essai réel de toutes les combinaisons auprès de l’Insee ; la clé de production n’est pas disponible dans cet environnement de développement. L’ancienne fonctionnalité de découverte d’associations dans `/atelier` utilise toujours ses propres sources.

Références :
- https://portail-api.insee.fr/catalog/api/2ba0e549-5587-3ef1-9082-99cd865de66f/doc?aq=ALL
- https://static.insee.fr/api-sirene/Insee_API_publique_modalites_connexion.pdf
- https://www.insee.fr/fr/information/9053325
