# Recherche d’entreprises via l’API Sirene 3.11

La nouvelle recherche utilise `https://api.insee.fr/api-sirene/3.11/siret`, et non l’API Recherche d’entreprises. Les fiches externes de consultation restent des liens vers l’Annuaire ; elles ne servent pas à obtenir les résultats.

## Configuration

Créer une application sur le portail API de l’Insee, souscrire à l’API Sirene ouverte et générer sa clé d’intégration. Sur Vercel, dans le projet, Settings > Environment Variables, ajouter `INSEE_API_KEY` avec la clé, pour l’environnement Production. Ne pas ajouter le préfixe `NEXT_PUBLIC_` et ne pas placer la clé dans un fichier versionné. Relancer un déploiement après changement de variable. En local, ajouter `INSEE_API_KEY=...` à `.env.local` puis redémarrer le serveur.

Le serveur passe la clé dans l’en-tête `X-INSEE-Api-Key-Integration`. Elle n’est ni dans l’URL, ni dans les données retournées au navigateur. Une clé absente ou refusée produit un message explicite ; aucune réponse fictive n’est utilisée.

## Fonctionnement et limites

Une recherche correspond à une requête `/siret` (10 établissements par page, pagination `debut`, 100 pages maximum). L’API compte les établissements ; le système retire les doublons SIREN dans chaque page et à l’ajout aux cartes. Des doublons peuvent réapparaître entre pages ; le total n’est pas un nombre d’entreprises uniques. L’adresse est celle de l’établissement retourné ; elle n’est identifiée comme siège que si `etablissementSiege` le confirme. Les éléments masqués `[ND]` et l’adresse d’une unité à diffusion partielle ne sont pas affichés.

Filtres : dénomination officielle, zone (neuf codes postaux lyonnais / Rhône / France), sections d’activité et tranches d’effectifs de l’unité légale. Les inconnus sont conservés si aucun filtre d’effectif n’est choisi ; ils sont exclus par le filtre. Les sections sont traduites en préfixes NAF rév. 2 ; l’Insee prévoit le changement vers NAF 2025 en janvier 2027 et cette traduction devra être adaptée. La recherche par identifiant ignore volontairement les autres filtres. Les entreprises individuelles dont l’identité est masquée ne sont pas affichées. Les catégories hors 1xxx–6xxx et les associations sont écartées ; ce n’est pas une liste exhaustive de toutes les unités du répertoire.

## Quota et erreurs

L’accès public est limité par l’Insee à 30 requêtes par minute. En plus du contrôle fournisseur, le serveur limite chaque instance à 25 requêtes sur 60 secondes, sans relance automatique, et transmet `Retry-After` si disponible. Cette limite en mémoire ne coordonne pas plusieurs instances serverless : elle ne garantit pas un quota global si plusieurs instances ou applications partagent une clé. Pour un usage soutenu ou multi-instance, ajouter un compteur partagé atomique avant d’élargir l’usage.

## Vérification

Les tests utilisent des réponses Sirene simulées, notamment pour la clé absente, les données partielles et les erreurs. La clé réelle n’étant pas encore fournie, aucun appel authentifié réel ni résultat de production ne peut être garanti avant configuration et essai avec une entreprise connue (par exemple SIREN 901931105). L’ancienne fonctionnalité de découverte d’associations dans `/atelier` utilise toujours ses propres sources.

Références :
- https://portail-api.insee.fr/catalog/api/2ba0e549-5587-3ef1-9082-99cd865de66f/doc?aq=ALL
- https://static.insee.fr/api-sirene/Insee_API_publique_modalites_connexion.pdf
- https://www.insee.fr/fr/information/9053325
