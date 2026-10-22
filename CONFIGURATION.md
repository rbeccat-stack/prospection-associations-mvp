# Configuration de la V0

En local, l'application fonctionne sur `http://127.0.0.1:3000`. Les clés et mots de passe se placent dans `.env.local`, jamais dans la conversation ni dans le navigateur. Copier `.env.example` vers `.env.local`, compléter les champs nécessaires, puis redémarrer `npm run dev`.

## Déploiement privé sur Vercel avec Turso

1. Créer une base Turso. Récupérer son URL `libsql://...` et un jeton d'accès à cette base.
2. Dans **Vercel → projet → Settings → Environment Variables**, ajouter `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` et `APP_PASSWORD` pour l'environnement Production. Choisir soi-même un long `APP_PASSWORD` unique. Ne jamais placer ces valeurs dans GitHub, ni les préfixer par `NEXT_PUBLIC_`.
3. Redéployer le projet. À l'ouverture du site, le navigateur demande un nom d'utilisateur et un mot de passe : le nom d'utilisateur est `swipe`, le mot de passe est exactement `APP_PASSWORD`.

L'application crée automatiquement ses tables dans la base Turso au premier accès. Sans `APP_PASSWORD`, le site renvoie 503 ; sans `TURSO_DATABASE_URL`, il ne peut pas ouvrir de base sur Vercel. `TURSO_AUTH_TOKEN` doit correspondre à la base et rester secret. Les données SQLite présentes dans `.data/prospection.db` ne sont pas transférées automatiquement vers Turso : le déploiement démarre avec une base vide. Conserver la base locale pour toute migration ultérieure.

Ce mot de passe unique protège toute l'application pour un usage personnel. Partager ce mot de passe donnerait accès aux dossiers et aux actions de l'application ; une gestion de comptes serait nécessaire pour plusieurs utilisateurs.

## Sans service externe

La collecte des URL publiques choisies, la lecture des trois dossiers pilotes, l'édition des brouillons, les versions précédentes, la prévisualisation du dossier et son téléchargement fonctionnent. L'analyse IA et l'envoi SMTP affichent « à connecter ».

## Analyse

Choisir un fournisseur qui propose une API HTTPS compatible Chat Completions avec `response_format: json_object` et `max_tokens`. Renseigner `AI_BASE_URL` (sans `/chat/completions`), `AI_MODEL` et `AI_API_KEY`, puis `AI_AUTHORIZED=true` après accord sur le service.

Chaque action transmet le texte des pages choisies, l'entrée de l'association, le ciblage et votre offre au fournisseur. Aucune autre donnée locale n'est transmise. Les pages sont traitées comme des données, sans outils exécutables. La sortie est validée ; ses références doivent appartenir à la collecte, les passages justificatifs doivent exister dans les pages et les contacts doivent y figurer.

Pour OpenRouter, l’application demande désormais `json_schema` avec `strict: true` et `provider.require_parameters: true`. Le schéma complet est aussi inclus dans les instructions, quel que soit le fournisseur. Toutes ses propriétés sont requises ; les valeurs optionnelles inconnues sont représentées par `null`, puis converties avant stockage. Les références de sources sont limitées aux identifiants réellement disponibles dans la collecte. Les contrôles de taille, de liens et de citations restent appliqués par le serveur. La prise en charge du format structuré varie selon le fournisseur qui sert le modèle : [documentation OpenRouter](https://openrouter.ai/docs/guides/features/structured-outputs).

Chaque tentative conserve un diagnostic technique privé dans `analysis_diagnostics`, lié à l’appel comptabilisé dans le quota. En cas d’erreur, utiliser « Télécharger le diagnostic de cette analyse » sous le message. Il indique le modèle, le fournisseur lorsqu’il est communiqué, l’étape du rejet et les champs invalides. Il ne contient ni clés, ni textes des pages, ni réponse brute de l’IA. Les noms de champs inconnus sont masqués. Ce téléchargement est protégé par le même mot de passe que l’application, ne relance pas l’IA et ne consomme pas de quota. Les réponses rejetées avant ce correctif ne peuvent pas être reconstituées.

Les identifiants des observations sont générés par l’application. La version du format (`schemaVersion`), le mode de préparation, les fiches de sources, les statuts de vérification et l’état « brouillon » sont également remplis par le serveur ; ils ne sont plus demandés au modèle. Une réponse contenant ces métadonnées mal renseignées reste récupérable, sous réserve que son contenu respecte les vérifications. Si l’IA relie une qualification à une hypothèse au lieu d’un fait, cette conclusion est laissée « À vérifier » ; une intervention non étayée est retirée. La fiche indique ces corrections dans les réserves et conserve les faits dont les extraits sont vérifiés. Dans ce cas, l’approche devient exploratoire et aucun brouillon IA n’est conservé, afin de ne pas reprendre une conclusion écartée. Une citation inventée, une source inconnue ou un contact absent continuent de faire rejeter la réponse. Aucun nouvel appel payant n’est lancé automatiquement pour réparer une réponse.

Après modification des URL ou du texte manuel, cliquer sur « Collecter ces sources » avant de relancer l’analyse. L’e-mail de test et le téléchargement comprennent aussi les pistes d’intervention, leurs premiers livrables, les points à confirmer et les passages justificatifs.

`AI_DAILY_REQUEST_LIMIT` limite les appels par journée UTC, échecs inclus ; `AI_MAX_OUTPUT_TOKENS` limite la réponse. Ce sont des limites de volume, **pas un plafond monétaire garanti**. Fixer aussi le budget dans le compte du fournisseur avant activation. La compatibilité exacte du modèle et la qualité d'une première réponse réelle restent à vérifier après choix du fournisseur. Les contrôles de citations ne prouvent pas à eux seuls que l'interprétation est correcte.

## E-mail personnel de test

Renseigner `SMTP_HOST`, `SMTP_PORT` (465 ou 587), `SMTP_USER`, `SMTP_PASSWORD`, `TEST_EMAIL_FROM` et `TEST_EMAIL_TO`. Ce dernier est l'unique destinataire autorisé côté serveur. Mettre `EMAIL_AUTHORIZED=true` après accord sur le service et les adresses.

Sur une fiche : enregistrer le brouillon, ouvrir la prévisualisation, puis cliquer sur « Envoyer le dossier de test à mon adresse ». La prévisualisation expire après 15 minutes et devient invalide si le dossier ou le destinataire change. Une version ne peut pas être envoyée deux fois par un double clic. Après une erreur ou un résultat incertain, une reprise exige de vérifier sa boîte puis de cocher la demande de reprise.

« Accepté par le serveur » ne prouve pas la réception. Après réception effective, cliquer sur « J'ai reçu ce dossier ». Aucun envoi à une association n'est disponible.

## Données et reprise

En local, SQLite est dans `.data/prospection.db` (ou le chemin `DATABASE_PATH`). Conserver ensemble la base et ses fichiers WAL lors d'une sauvegarde à chaud, ou arrêter le serveur avant copie. Sur Vercel, la base est distante chez Turso et sa sauvegarde se gère dans ce service. Les migrations de schéma sont additives et préservent les dossiers existants dans chaque base. Chaque modification de dossier conserve l'ancienne version ; les versions et le contenu des e-mails restent figés.

Une collecte interrompue peut être relancée après cinq minutes. Une tentative e-mail interrompue devient « résultat incertain » après deux minutes : vérifier la boîte avant reprise. Les erreurs affichées ne contiennent pas les réponses brutes des fournisseurs ni leurs secrets.

Les pages exigeant JavaScript, une authentification ou dépassant 3 Mo ne sont pas collectées. Exception : une fiche précise de l’Annuaire des entreprises est lue via l’API officielle, sans exécuter sa page JavaScript. Six URL explicites maximum par collecte. La découverte d’associations lyonnaises interroge l’API publique Recherche d’entreprises à la demande ; elle ne recherche pas automatiquement le site de chaque association et ne déduit aucun besoin de l’annuaire seul. L’analyse d’une association issue de l’annuaire exige au moins une autre page publique lisible avant de consommer un appel IA. Les redirections hors du site initial demandent de fournir explicitement la nouvelle URL. Les adresses privées sont refusées et la résolution DNS est épinglée pour la connexion.

## Moteur d’éditions

Aucune variable supplémentaire. Une édition interroge l’API publique du Journal officiel des associations (DILA), lit les sites déclarés avec le même collecteur et consomme au plus cinq appels IA, dans la limite de `AI_DAILY_REQUEST_LIMIT`. Avec OpenRouter, l’application demande le relevé d’usage (`usage.include`) pour enregistrer les jetons et le coût de chaque appel dans son diagnostic privé. Voir [docs/refonte-mobile/MOTEUR.md](docs/refonte-mobile/MOTEUR.md).

## Références techniques des adaptateurs

- [Nodemailer : SMTP et TLS](https://nodemailer.com/smtp)
- [Cheerio : lecture HTML](https://cheerio.js.org/docs/basics/loading/)
- [Exemple de protocole Chat Completions compatible](https://docs.mistral.ai/api/endpoint/chat) — aucun fournisseur n'est sélectionné par défaut.
