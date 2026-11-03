# Recherche connectée à l’Annuaire — première brique

La page d’accueil ouvre désormais « Rechercher ». Aucune clé API n’est nécessaire. Le navigateur appelle notre route serveur `GET /api/companies/search`, qui interroge exclusivement `https://recherche-entreprises.api.gouv.fr/search`.

## Utilisation
- Chercher par nom/adresse ou SIREN/SIRET.
- Pour une liste : choisir Lyon (9 arrondissements), Rhône ou France ; éventuellement une section d’activité et une tranche d’effectif.
- Lancer la recherche à la demande. Dix résultats bruts par page, jusqu’à 100 pages dans ce pilote ; aucune extraction exhaustive ni recherche quotidienne.
- Consulter la fiche officielle ; cliquer « Ajouter à découvrir » pour retrouver l’entreprise dans les cartes, puis garder/passer.
- Les profils ajoutés et leurs références restent dans le navigateur. Les résultats de recherche et filtres ne sont pas sauvegardés après changement d’écran.

## Interprétation
Le texte recherche l’identité et l’adresse ; ce n’est pas une recherche sémantique d’activité. La section et l’effectif concernent l’unité légale. Le territoire porte sur les établissements. Le siège peut être ailleurs. Une implantation locale est affichée seulement si la réponse contient un établissement actif dans la zone ; sinon l’adresse locale reste non confirmée. Les établissements connexes renvoyés par l’API ne sont pas une liste exhaustive de tous les établissements.

Un SIREN/SIRET ignore tous les filtres dans l’API officielle. Les filtres sont désactivés et cette particularité est expliquée. Le pilote n’affiche que les entreprises actives, des catégories juridiques 1xxx à 6xxx, hors association 5195 et hors associations/administrations signalées par l’API. Il ne prétend donc pas couvrir toutes les entités de l’Annuaire. Le total brut peut dépasser le nombre de profils affichables.

L’effectif est affiché avec son année quand disponible ; inconnu ne veut pas dire zéro. Filtrer par taille exclut les effectifs non renseignés. Une source administrative ne confirme ni un besoin, ni un recrutement, ni le caractère « startup ». Aucun email, site web, logo ou besoin supposé n’est inventé lors de l’ajout.

## Robustesse
Entrées validées et bornées côté serveur, URL fournisseur fixe, délai de 12 secondes, redirections refusées, réponse fournisseur validée, erreurs visibles sans faux résultats de secours, Retry-After transmis pour les limites, requête précédente annulée quand les filtres changent, dédoublonnage SIREN à l’affichage et à l’ajout. Pas de relance automatique. L’accès privé de production existant couvre la nouvelle route.

## Vérification lors de la livraison
55 tests automatisés passent, dont 9 nouveaux tests pour cette recherche (réponses fournisseur simulées), et TypeScript passe. Un appel réel via le nouveau service n’a pas réussi à joindre l’Annuaire dans cet environnement, dont les connexions sortantes avaient été refusées pendant l’audit. Aucun résultat de production n’est donc prétendu validé par ces tests. Il reste à vérifier le réseau et une réponse réelle depuis l’hébergement avant de considérer l’accès opérationnel en production.

## Documentation source
Documentation officielle consultée pendant l’implémentation : https://recherche-entreprises.api.gouv.fr/docs/ . La limite publiée est 7 requêtes/seconde/IP et 30/seconde/ASN, avec un débit non garanti ; l’interface ne déclenche qu’une recherche manuelle et bloque la relance pendant le délai de limitation indiqué, plafonné à 5 minutes dans le pilote. Prévoir une limitation globale et un cache serveur si l’usage devient soutenu ou multi-utilisateur.

Le serveur de développement webpack démarre (Ready), mais le contrôle HTTP local a expiré dans cet environnement ; la compilation de la page à la demande et le parcours dans un navigateur n’ont donc pas été validés.
