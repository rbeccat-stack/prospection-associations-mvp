# Refonte mobile — cadrage du 20 octobre 2026

Statut : proposition de réalisation à examiner avec la maquette. Ce document définit la cible ; il ne décrit pas des fonctionnalités déjà livrées.

## Promesse

« J’ouvre l’application, je découvre des associations lyonnaises pour lesquelles une intervention pertinente a été repérée, et je sélectionne celles que je souhaite approcher. »

Application web installable sur téléphone, confirmée par Rémi. Le formulaire « Votre ciblage » sort du parcours. L’ajout manuel d’une association et de sources devient facultatif. Le nom Swipe & Prospect reste un nom de travail.

## Parcours principal

1. **Propositions** : une sélection finie, préparée en amont, affichée en cartes. Chaque carte donne le nom, l’implantation lyonnaise, l’activité, un constat précis et l’aide envisageable.
2. **Choix** : « Garder », « Passer » et « Voir le dossier ». Le swipe complète les boutons. Le dernier choix peut être annulé. Garder ajoute l’association à la sélection ; passer la retire des propositions ordinaires sans la supprimer de l’historique.
3. **Sélection** : retrouver les associations conservées et leur prochaine action. États proposés : « À explorer », « À contacter », « Contactée », « À relancer ». « Contactée » exige une action explicite ; la consultation ou la copie d’un brouillon ne le déduit pas.
4. **Dossier** : voir pourquoi l’association a été retenue, ouvrir les preuves, comprendre l’intervention proposée et préparer sa prise de contact.

À la fin d’une sélection, indiquer que toutes les cartes ont été examinées et proposer d’ouvrir la sélection personnelle. Une liste vide n’est pas une panne. Une préparation en cours indique son état et laisse accéder aux dossiers déjà prêts ; elle ne déclenche pas une analyse au moment du swipe.

## Ciblage intégré

- Lyon, ses neuf arrondissements ; tous secteurs. La métropole pourra être ajoutée ultérieurement sans élargissement implicite.
- Offre de Rémi : automatisations avec ou sans IA, site, CRM, newsletter, formulaires et organisation des données des adhérents, bénévoles ou donateurs.
- L’association doit exercer une activité identifiable et avoir une implantation locale étayée.
- Évaluer séparément le besoin numérique observable et la capacité à accueillir une mission.
- Préférer une première intervention limitée, utile et maintenable par l’association.
- Une structure déjà équipée peut avoir une piste pertinente d’exploitation de données ou de mesure d’impact ; la maturité numérique ne suffit pas à l’écarter.

Ce périmètre remplace, pour la refonte, les anciennes priorités sectorielles du document historique. Les anciens dossiers conservent leurs critères d’origine.

## Ce qu’un dossier doit permettre de comprendre

| Question | Réponse attendue |
| --- | --- |
| Qui est-ce ? | Activité, identité et implantation locale, avec distinction siège / établissement. |
| Pourquoi cette proposition ? | Un constat observable et son passage justificatif, avec source et date. |
| Quel besoin possible ? | Une interprétation argumentée, clairement distinguée d’un fait établi. |
| Puis-je aider ? | Une intervention liée aux compétences de Rémi et aux faits observés. |
| Par où commencer ? | Un premier livrable concret et un point à confirmer avec l’association. |
| L’association peut-elle l’accueillir ? | Indices d’interlocuteur, de fonctionnement ou d’échéance ; inconnus explicites. |
| Comment approcher ? | Un angle et un brouillon révisable, avec les coordonnées réellement trouvées. |

Le dossier KoToPo sert de référence de profondeur, pas de texte à reproduire. Il faudra vérifier les données avant de les réutiliser : notamment une tranche d’effectif « NN » signifie inconnu ; une absence visible de CRM ou de newsletter ne prouve pas leur absence ; des finances difficiles ne prouvent pas l’impossibilité de payer une prestation. Aucun chiffre de gain ou de temps n’est inventé.

## Conditions pour publier une carte

Une association entre dans les propositions lorsque son implantation lyonnaise est étayée, qu’au moins un signal utile est appuyé sur une source consultée et qu’une intervention cohérente peut être proposée. Le simple résultat d’un annuaire n’y suffit pas. Un appel public explicite à une compétence est un signal fort ; un indice indirect donne une piste à confirmer, présentée comme telle.

Le système garde les sources, dates de consultation et de publication disponibles, extraits et versions. Il vérifie les contradictions importantes, les événements expirés, les références et les coordonnées. La confiance reflète la qualité des preuves ; elle ne représente pas la probabilité de signer un client.

Un accès refusé, une réponse IA invalide ou un manque de preuves maintient la candidature en recherche. Le problème reste visible dans l’espace de gestion, sans obliger Rémi à réparer une collecte pour parcourir les cartes déjà prêtes. Si aucune source exploitable n’est trouvée, l’application le constate et cherche d’autres candidates.

## Préparation des propositions

Chaîne cible : découverte d’associations → dédoublonnage → recherche du site et de sources complémentaires → collecte → analyse → contrôle des preuves → dossier prêt → sélection publiée.

La préparation s’exécute côté serveur, indépendamment de l’écran ouvert. Les cartes publiées restent consultables pendant une nouvelle préparation. Chaque étape conserve son état, ses limites, son diagnostic et ses reprises pour éviter les doubles analyses payantes.

Le volume de cartes ne correspond pas au volume d’appels IA : il faudra parfois examiner davantage de candidates que de propositions publiées. Proposition de pilote : viser jusqu’à cinq cartes utiles, accepter une sélection plus courte et mesurer le coût réel. Budget et fréquence seront fixés avant d’activer une préparation récurrente. Aucun horaire ni engagement quotidien n’est encore arrêté.

## Livraison par paliers

1. **Cadrage et maquette** : valider les cartes, la sélection et le niveau de détail avec des données exemples identifiées comme telles.
2. **Preuve du moteur** : produire quelques dossiers réels sans saisie préalable des URL par Rémi ; mesurer pertinence, sources, échecs et coût.
3. **Parcours mobile connecté** : brancher les dossiers prêts et enregistrer choix, annulation et suivi dans Turso.
4. **Préparation récurrente et installation** : configurer la cadence, les reprises, les états vides et l’installation ; vérifier sur téléphone réel.
5. **Pilote et mise en production** : faire parcourir une sélection réelle à Rémi et vérifier la qualité avant de remplacer le parcours actuel.

## À conserver et à compléter

Conserver les données et anciennes versions, les vérifications de preuves, les brouillons, l’e-mail personnel de test et les diagnostics. Ajouter le repérage automatique des sites, une file de préparation durable, les choix de cartes, le suivi et le parcours installable. La migration sera additive ; aucune remise à zéro de la base n’est prévue.

L’e-mail de test existant n’est pas un envoi de prospection. Le premier pilote prépare une approche et permet de la copier ; toute intégration future d’un envoi vers une association devra être définie et testée séparément.

## Validation du pilote

- Ouvrir le lien sur téléphone mène directement à des cartes prêtes, sans formulaire de ciblage.
- Chaque carte relie un signal justifié à une aide possible ; les exemples de maquette ne sont jamais présentés comme une recherche récente.
- Garder, passer, annuler et recharger conservent un état cohérent ; une association déjà traitée n’apparaît pas en doublon.
- Le dossier donne accès aux preuves et aux réserves, avec une distinction claire entre constat et besoin supposé.
- Les dossiers existants et leurs versions restent accessibles.
- Un échec de préparation ne casse pas la consultation de la sélection disponible.
- Une session réelle produit des dossiers jugés utiles par Rémi ; une maquette ou des tests simulés ne valident pas la qualité de l’IA.

## Décisions à prendre après la maquette

Volume et fréquence, plafond de dépense, fraîcheur des informations et conditions de réapparition d’une association passée. Le parcours de base, le territoire, les compétences et l’absence de ciblage à ressaisir sont déjà confirmés.
