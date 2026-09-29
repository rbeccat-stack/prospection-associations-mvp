# Configuration de la V0

L'application fonctionne sur `http://127.0.0.1:3000`. Les clés et mots de passe se placent dans `.env.local`, jamais dans la conversation ni dans le navigateur. Copier `.env.example` vers `.env.local`, compléter les champs nécessaires, puis redémarrer `npm run dev`.

## Sans service externe

La collecte des URL publiques choisies, la lecture des trois dossiers pilotes, l'édition des brouillons, les versions précédentes, la prévisualisation du dossier et son téléchargement fonctionnent. L'analyse IA et l'envoi SMTP affichent « à connecter ».

## Analyse

Choisir un fournisseur qui propose une API HTTPS compatible Chat Completions avec `response_format: json_object` et `max_tokens`. Renseigner `AI_BASE_URL` (sans `/chat/completions`), `AI_MODEL` et `AI_API_KEY`, puis `AI_AUTHORIZED=true` après accord sur le service.

Chaque action transmet le texte des pages choisies, l'entrée de l'association, le ciblage et votre offre au fournisseur. Aucune autre donnée locale n'est transmise. Les pages sont traitées comme des données, sans outils exécutables. La sortie est validée ; ses références doivent appartenir à la collecte, les passages justificatifs doivent exister dans les pages et les contacts doivent y figurer.

`AI_DAILY_REQUEST_LIMIT` limite les appels par journée UTC, échecs inclus ; `AI_MAX_OUTPUT_TOKENS` limite la réponse. Ce sont des limites de volume, **pas un plafond monétaire garanti**. Fixer aussi le budget dans le compte du fournisseur avant activation. La compatibilité exacte du modèle et la qualité d'une première réponse réelle restent à vérifier après choix du fournisseur. Les contrôles de citations ne prouvent pas à eux seuls que l'interprétation est correcte.

## E-mail personnel de test

Renseigner `SMTP_HOST`, `SMTP_PORT` (465 ou 587), `SMTP_USER`, `SMTP_PASSWORD`, `TEST_EMAIL_FROM` et `TEST_EMAIL_TO`. Ce dernier est l'unique destinataire autorisé côté serveur. Mettre `EMAIL_AUTHORIZED=true` après accord sur le service et les adresses.

Sur une fiche : enregistrer le brouillon, ouvrir la prévisualisation, puis cliquer sur « Envoyer le dossier de test à mon adresse ». La prévisualisation expire après 15 minutes et devient invalide si le dossier ou le destinataire change. Une version ne peut pas être envoyée deux fois par un double clic. Après une erreur ou un résultat incertain, une reprise exige de vérifier sa boîte puis de cocher la demande de reprise.

« Accepté par le serveur » ne prouve pas la réception. Après réception effective, cliquer sur « J'ai reçu ce dossier ». Aucun envoi à une association n'est disponible.

## Données et reprise

SQLite est dans `.data/prospection.db` (ou le chemin `DATABASE_PATH`). Conserver ensemble la base et ses fichiers WAL lors d'une sauvegarde à chaud, ou arrêter le serveur avant copie. Les migrations sont additives et préservent les trois dossiers existants. Chaque modification de dossier conserve l'ancienne version ; les versions et le contenu des e-mails restent figés.

Une collecte interrompue peut être relancée après cinq minutes. Une tentative e-mail interrompue devient « résultat incertain » après deux minutes : vérifier la boîte avant reprise. Les erreurs affichées ne contiennent pas les réponses brutes des fournisseurs ni leurs secrets.

Les pages exigeant JavaScript, une authentification ou dépassant 1 Mo ne sont pas collectées. Trois URL explicites maximum par collecte ; aucune découverte automatique du Web. Les redirections hors du site initial demandent de fournir explicitement la nouvelle URL. Les adresses privées sont refusées et la résolution DNS est épinglée pour la connexion.

## Références techniques des adaptateurs

- [Nodemailer : SMTP et TLS](https://nodemailer.com/smtp)
- [Cheerio : lecture HTML](https://cheerio.js.org/docs/basics/loading/)
- [Exemple de protocole Chat Completions compatible](https://docs.mistral.ai/api/endpoint/chat) — aucun fournisseur n'est sélectionné par défaut.
