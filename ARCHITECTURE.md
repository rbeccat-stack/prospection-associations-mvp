# Architecture V0

Next.js App Router et TypeScript servent l’interface sur 127.0.0.1. SQLite avec WAL reste locale, sans compte. Les écritures valident l’origine locale, le type JSON et des schémas stricts. Une authentification adaptée serait nécessaire avant toute exposition sur Internet.

## Parcours

`ciblage versionné → test → collecte explicite → analyse → dossier versionné → édition → prévisualisation figée → tentative SMTP → confirmation humaine de réception`

- `collector.ts` : trois URL explicites maximum. Contrôle des protocoles, ports, DNS et réseau privé ; adresse validée épinglée dans la connexion. Redirections limitées au même site. Taille et durée limitées. Extraction du texte sans exécuter les scripts.
- `analysis.ts` : adaptateur HTTPS Chat Completions, sortie JSON Zod, sources bornées à la collecte, extraits justificatifs et coordonnées vérifiés dans le texte. Aucun outil pour le modèle. Compteur quotidien réservé avant l’appel, échecs inclus. Pas de fournisseur par défaut.
- `workflow.ts` : verrou avec reprise après interruption, collections, anciennes versions et contrôle de concurrence par révision. Les tables de faits, sources et brouillons restent synchronisées.
- `delivery.ts` : texte partagé par prévisualisation, téléchargement et SMTP. Jeton de 15 minutes, contrôle de révision et du destinataire, unicité par test/révision. Tentatives historisées, reprise explicite, état « accepté » distinct de « reçu ». Destinataire et expéditeur configurés côté serveur.
- `services.ts` : variables d’environnement. L’interface reçoit l’état des services, le modèle, la limite d’appels et l’adresse personnelle ; jamais les secrets.

## Données

Migrations additives : colonne `revision`, tables `dossier_revisions`, `collections`, `workflows`, `ai_calls`, `delivery_previews`, `deliveries` et `delivery_attempts`. Le statut historique de création dans `test_runs` est conservé ; les états de travail et livraison sont lus séparément.

Une erreur de génération ne remplace pas la fiche précédente. Une correction conserve son ancien JSON complet. Une livraison conserve son contenu exact et son destinataire. Les contacts ne sont jamais utilisés comme destinataires.

## Limites

Les adaptateurs attendent leur configuration et un essai réel ; SMTP est simulé dans les tests. Les limites de tokens/appels ne remplacent pas un plafond financier chez le fournisseur. Les sites nécessitant JavaScript et les documents non HTML/texte restent hors collecte. Les extraits contrôlés ne garantissent pas l’exactitude des inférences.

Voir `ACCEPTATION-V0.md` et `CONFIGURATION.md`.
