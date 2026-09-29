# PRD — Prospection d’associations

**Statut :** cadrage initial, soumis à validation

**Version :** 0.1 — 28 septembre 2026
**Périmètre de livraison immédiat :** MVP 0, « dossier quotidien de test »

**Cadrage de recherche adopté le 29 septembre 2026 :** voir [METHODE-CIBLAGE.md](METHODE-CIBLAGE.md). Le document fourni par l'utilisateur définit les champs prioritaires, les deux axes d'analyse et le modèle de tri à instruire. Les scores numériques et la découverte multi-sources relèvent d'une étape ultérieure, après instrumentation des signaux et traitement explicite des inconnus. Les tests déjà enregistrés conservent leur version de ciblage.

## 1. Résumé

Une application personnelle aide à repérer des associations pertinentes et à préparer une approche utile, vérifiable et respectueuse. À terme, l’utilisateur reçoit chaque jour une sélection de `X` fiches à l’heure `Y`, les examine rapidement, puis décide de les conserver, de les corriger ou de les écarter.

Le MVP 0 vérifie seulement la chaîne `critères → association fournie manuellement → analyse sourcée → fiche structurée → e-mail de test reçu sur l’adresse personnelle`. Son lancement est manuel. Le message de prospection reste un brouillon dans la fiche et dans l’e-mail de test ; aucun message ne part vers une association.

## 2. Problème et utilisateur

### Problème

La recherche manuelle d’associations, la vérification des informations et la rédaction d’une approche prennent du temps. Une simple liste de noms ne permet pas de juger la pertinence ; un texte généré sans preuves peut créer de faux besoins ou de fausses coordonnées. Le produit doit réduire ce travail tout en laissant à l’utilisateur la vérification et la décision de contact.

### Utilisateur initial

- Une seule personne, propriétaire du projet, qui définit le ciblage, lance les tests, examine les dossiers et décide de toute prise de contact.
- Les associations et leurs membres ne sont pas utilisateurs du MVP 0 et ne reçoivent aucun e-mail de l’application.
- Un usage en équipe, des rôles et une authentification multi-utilisateur restent à étudier après validation du besoin.

## 3. Objectifs et mesures

### Objectifs du MVP 0

1. Saisir et retrouver une version de critères de ciblage.
2. Produire, à partir d’une association fournie manuellement, une fiche lisible qui distingue faits sourcés, interprétations et informations manquantes.
3. Vérifier que chaque élément factuel important renvoie à une source consultable.
4. Produire un angle d’approche et un brouillon personnalisés, modifiables et jamais envoyés au prospect.
5. Conserver le dossier et l’état du test, puis envoyer sa représentation à la seule adresse personnelle configurée, après action explicite.

### Indicateurs de validation

- Sur un petit jeu de **3 associations choisies par l’utilisateur**, au moins **2 dossiers** sont jugés suffisamment pertinents et vérifiables pour une revue humaine. Ce seuil sert à décider si l’on améliore la collecte ou si l’on avance ; ce n’est pas une promesse de performance.
- **100 % des affirmations factuelles importantes affichées** ont au moins une référence de source ou portent la mention explicite « à vérifier / information manquante / hypothèse ».
- **0 contact inventé et 0 e-mail envoyé à une association** dans les journaux et les tests du MVP 0.
- Pour un test réussi, le dossier enregistré et l’e-mail reçu présentent les mêmes identité, raisons de correspondance, réserves, sources et brouillon.
- Les échecs de collecte, de génération, de validation ou d’envoi sont visibles et ne sont jamais présentés comme des dossiers complets ou des e-mails remis.

## 4. Parcours utilisateur du MVP 0

1. L’utilisateur renseigne ses critères : zone, types d’associations, thèmes, taille éventuelle, signaux recherchés, exclusions et préférence de ton. Les champs non définis restent facultatifs et ne deviennent pas des filtres implicites.
2. Il fournit une association test par URL, par ligne CSV ou par saisie manuelle. Un petit jeu de démonstration peut servir à tester l’interface, avec des données explicitement marquées comme démonstration ; il ne sert pas à prouver la qualité des informations réelles.
3. Il clique sur **« Lancer un test »**. Une exécution possède un identifiant, une date, la version des critères, l’entrée utilisée et un état.
4. Le système collecte uniquement les informations accessibles selon la source et la méthode approuvées, garde les références et extrait des faits. Un lien inaccessible est signalé ; le système ne comble pas le manque par invention.
5. Le système prépare une analyse structurée : correspondances aux critères, signaux, réserves, degré de confiance justifié, approche et brouillon. Les données générées sont validées avant enregistrement.
6. L’utilisateur voit une fiche où les sources sont accessibles depuis les affirmations concernées. Il peut corriger le brouillon ou les critères puis relancer un test ; les versions précédentes restent traçables.
7. Une action explicite **« Envoyer le dossier de test »** adresse un e-mail de prévisualisation exclusivement à l’adresse personnelle configurée. Le brouillon de prospection y est présenté comme brouillon, sans adresse de prospect dans les champs destinataires.
8. L’utilisateur retrouve le dossier, son état d’envoi et les erreurs éventuelles dans un historique minimal.

La cadence `X` et l’heure `Y` sont des besoins de la vision cible ; aucune planification quotidienne n’est exécutée dans le MVP 0.

## 5. Fonctionnalités du MVP 0

| ID | Fonction | Comportement attendu |
| --- | --- | --- |
| F01 | Critères | Créer et modifier un profil ; enregistrer une version utilisée par chaque test. |
| F02 | Entrée manuelle | Accepter une URL, une ligne CSV ou une fiche saisie ; signaler les champs et sources absents. Import CSV limité à un petit lot volontairement lancé, avec aperçu avant traitement. |
| F03 | Collecte maîtrisée | Consulter seulement les URL fournies ou les sources autorisées ; enregistrer URL, titre, date de consultation et extrait ou référence utile. Pas de parcours massif du Web. |
| F04 | Dédoublonnage minimal | Détecter au minimum une URL canonique déjà traitée ; avertir avant de regénérer. Garder les anciens dossiers et permettre un nouveau test explicite. Un identifiant officiel, s’il existe, renforce la détection. |
| F05 | Fiche structurée | Afficher identité, activité, résumé, contacts effectivement trouvés, signaux, correspondances aux critères, réserves, confiance, approche, brouillon et sources. Une valeur inconnue est affichée comme telle. |
| F06 | Traçabilité | Relier chaque fait important et chaque signal à une ou plusieurs sources ; distinguer clairement fait, inférence, hypothèse et information manquante. |
| F07 | Brouillon | Générer ou rédiger une proposition modifiable ; ne jamais l’envoyer au prospect. Le texte ne contient pas d’allégation non vérifiée formulée comme un fait. |
| F08 | Historique | Lister les tests avec date, association, version des critères, statut, dossier et état de l’e-mail ; consulter le détail. |
| F09 | E-mail de test | Prévisualiser puis envoyer le dossier sur action manuelle vers une adresse personnelle unique configurée côté serveur. Journaliser tentative, succès fournisseur et échec sans confondre « accepté par le fournisseur » et « reçu ». |
| F10 | États d’erreur | Afficher les erreurs de source inaccessible, données insuffisantes, validation JSON et envoi ; permettre une reprise manuelle sans créer d’envoi accidentel en double. |

## 6. Structure de la fiche et règles de contenu

- **Identité :** nom, localisation, site, description et activité, avec provenance par champ si connus.
- **Contacts :** type, valeur ou lien, rôle/personne si publiquement identifiés, source et date de consultation. Aucun contact déduit à partir d’un format d’e-mail supposé.
- **Signaux :** observation sourcée, interprétation séparée, date si disponible et degré de confiance. « Besoin potentiel » est toujours présenté comme une hypothèse, jamais comme une demande exprimée par l’association.
- **Correspondance :** chaque critère évalué indique `correspond / ne correspond pas / inconnu`, sa justification et les sources nécessaires. Une note globale éventuelle n’efface pas ces détails.
- **Approche :** angle proposé, justification, bénéfice envisagé et points à vérifier avant tout contact.
- **Brouillon :** sujet et corps du message, clairement étiquetés « brouillon non envoyé ». Si la base factuelle est trop faible, le brouillon peut être remplacé par « informations insuffisantes pour personnaliser ».
- **Sources :** URL ou référence d’entrée, titre ou libellé, date de consultation, passage utilisé si possible et statut d’accès. Une source fournie par l’utilisateur est distinguée d’une source publique indépendante.
- **Confiance :** niveau simple `faible / moyen / élevé`, accompagné de raisons lisibles ; il reflète surtout la qualité et la fraîcheur des preuves, sans se présenter comme une probabilité calibrée.

## 7. Modèle de données initial, conceptuel

Les noms ci-dessous décrivent les responsabilités ; ils ne figent pas le schéma SQL.

| Entité | Champs principaux | Rôle |
| --- | --- | --- |
| `targeting_profile` | id, nom, critères JSON validés, version, dates | Définit les préférences ; une version est figée par test. |
| `association` | id, nom, URL canonique, identifiant officiel facultatif, localisation, dates | Identité stable pour limiter les doublons. |
| `input_record` | id, association_id, type `url/csv/manual/demo`, valeur d’origine, date | Conserve ce que l’utilisateur a fourni, distinct du résultat enrichi. |
| `source_record` | id, association_id, URL/référence, titre, date de consultation, date de publication si connue, statut, extrait ou pointeur | Conserve la provenance et la possibilité de revérifier. |
| `test_run` | id, profile_id + version, input_record_id, date, état, erreur | Suit une exécution manuelle de bout en bout. |
| `dossier` | id, run_id, version de schéma, identité normalisée, synthèse, correspondances, réserves, confiance, date | Résultat structuré et validé ; ne remplace pas les données sources. |
| `claim` | id, dossier_id, champ/texte, nature `fait/inférence/hypothèse/inconnu`, source_record_ids, statut de vérification | Rend vérifiable le contenu important de la fiche. |
| `outreach_draft` | id, dossier_id, canal, angle, sujet, corps, version, état `brouillon` | Sépare rédaction et décision d’envoi. |
| `test_delivery` | id, dossier_id, destinataire de test, date de demande, statut, identifiant fournisseur, erreur | Trace l’envoi du dossier à l’utilisateur uniquement. |

Une future entité `review_decision` stockera validation, rejet, correction et **motif de rejet codifié** (`mauvaise cible`, `taille`, `besoin peu crédible`, `contacts insuffisants`, `angle faible`, `déjà contactée`, autre + commentaire). Ces signaux serviront à réviser le ciblage au MVP 1 ; ils ne doivent pas modifier rétroactivement les dossiers passés.

## 8. Traçabilité et qualité des sources

1. Une affirmation importante comprend notamment identité, activité, localisation, taille, contact, signal, besoin allégué et élément de personnalisation. Elle référence une source identifiable ou reçoit un libellé explicite de non-vérification.
2. Les sources restent liées aux affirmations dans les données, la fiche et l’e-mail, pas seulement réunies en bas de page.
3. Le système conserve la date de consultation et, si accessible, la date de publication. Une information ancienne ou contradictoire baisse la confiance et est signalée.
4. Une inférence IA cite les faits qui la motivent mais reste étiquetée comme interprétation. Aucune source ne doit être fabriquée par le modèle ; les références générées doivent correspondre à des sources enregistrées.
5. Les sorties IA suivent un schéma JSON strict, validé côté serveur. Une sortie invalide est rejetée ou régénérée de façon contrôlée ; elle n’entre pas dans l’historique comme dossier validé.
6. Une source non accessible ou insuffisante ne peut pas être utilisée comme preuve d’une coordonnée ou d’un besoin. Le dossier peut être conservé avec un statut incomplet pour diagnostic.
7. Les données personnelles collectées sont limitées aux points de contact utiles, publiquement disponibles et sourcés. Une vérification des obligations applicables précède toute future fonction d’envoi vers des tiers.

## 9. Architecture envisagée et arbitrages à valider

- **Application :** Next.js + TypeScript, avec interface et routes serveur dans un projet lisible. Cela convient au flux manuel et laisse une voie vers la planification. Les opérations sensibles et les secrets restent côté serveur.
- **Stockage MVP 0 :** une base SQLite locale est l’option de départ la plus simple si l’application reste sur un seul poste. Supabase devient pertinent si l’accès multi-appareils, l’hébergement persistant ou l’authentification sont nécessaires. Le modèle de données doit permettre cette migration ; le choix final dépend du mode d’usage souhaité.
- **Authentification :** pas de compte pour une application strictement locale et privée. Avant toute exposition sur Internet, ajouter une authentification et protéger les routes de test et d’envoi ; Supabase Auth est une option.
- **Analyse IA :** une étape serveur produit du JSON contraint et validé. Le fournisseur, les coûts, la transmission des données et le mode de conservation doivent être approuvés avant toute connexion. Un parcours manuel ou des données de démonstration peut tester l’interface et le stockage en attendant, sans prétendre valider la qualité IA.
- **E-mail :** adaptateur serveur avec destinataire autorisé unique et prévisualisation obligatoire. Le fournisseur transactionnel, l’identité d’expéditeur et les secrets seront choisis avant le premier envoi de test. Aucun e-mail n’est envoyé pendant ce cadrage.
- **Planification :** absente du MVP 0 ; plus tard, tâche native à l’hébergeur ou à l’application avec verrou/idempotence et heure/fuseau configurés. Aucun n8n ni système multi-agent.

Le flux futur distingue les étapes **déterministes** (entrées, historique, dédoublonnage, planification, livraison), les étapes **IA** (synthèse, qualification, score expliqué, angle, brouillon) et les **contrôles humains** (vérification, correction, décision de contact).

## 10. Critères d’acceptation précis du MVP 0

Le MVP 0 est accepté lorsque les scénarios suivants passent sur un environnement de test local et une adresse personnelle autorisée :

1. **Critères :** modifier un profil puis lancer un test conserve la version exacte utilisée ; modifier ensuite le profil ne change pas l’ancien dossier.
2. **Entrée :** une URL, une ligne CSV ou une saisie manuelle valide peut initier un test. Une entrée vide ou invalide produit un message exploitable et aucun dossier trompeur.
3. **Source inaccessible :** le test indique la limite ; aucun fait ou contact n’est fabriqué pour remplir la fiche.
4. **Fiche :** les rubriques de la section 6 sont visibles, y compris les valeurs inconnues, les réserves et le statut de confiance.
5. **Preuves :** pour chaque fait important présent dans la fiche et dans l’e-mail, un lien ou une référence de source est accessible ; sinon il est clairement marqué comme hypothèse/à vérifier. Les identifiants de sources générés qui n’existent pas sont rejetés.
6. **Contacts :** aucune adresse, aucun téléphone ni aucune personne n’est ajouté sans source ; l’absence de coordonnées est explicitement affichée.
7. **Brouillon :** il est éditable, conservé séparément de l’analyse, clairement marqué « non envoyé » et ne déclenche aucun envoi au prospect.
8. **Historique et doublons :** les tests et leurs états sont consultables ; une association déjà examinée est signalée avant un nouveau test sans effacer l’historique.
9. **Envoi de test :** seule l’adresse personnelle configurée côté serveur peut recevoir l’e-mail ; une tentative de destinataire différent est refusée. L’envoi exige une action manuelle après prévisualisation. Un second clic ou une reprise après délai ne doit pas provoquer silencieusement deux messages.
10. **Correspondance e-mail/fiche :** le message de test contient l’association, les critères pertinents, les sources, les réserves et le brouillon tels qu’enregistrés ; son statut distingue la réponse du fournisseur de la réception effectivement vérifiée par l’utilisateur.
11. **Échecs :** un JSON invalide, une erreur de source ou une erreur d’e-mail donne un état d’échec traçable et une voie de reprise manuelle. Aucun secret n’apparaît dans l’interface, l’e-mail ou les journaux.
12. **Sécurité du périmètre :** aucune route, tâche ou interface ne permet d’envoyer un e-mail à une association dans le MVP 0 ; aucune tâche quotidienne automatique n’est active.

La réception en boîte personnelle est vérifiée par l’utilisateur ; une réponse « accepté » du fournisseur seule ne suffit pas à valider la chaîne complète.

## 11. Hors périmètre du MVP 0

- Découverte automatique d’associations et classement quotidien de `X` prospects.
- Planification à l’heure `Y`, notification quotidienne et collecte à grande échelle.
- Swipe, file de revue avancée, apprentissage des rejets et CRM.
- Envoi automatique ou assisté de messages à des associations, séquences et relances.
- Intégrations LinkedIn, n8n, scraping massif, système multi-agent et comptes d’équipe.
- Déduction de coordonnées ou garantie de délivrabilité / d’exactitude des données externes.

## 12. Risques et garde-fous

| Risque | Garde-fou MVP 0 |
| --- | --- |
| Faits ou liens inventés par l’IA | Références bornées aux sources enregistrées, validation de schéma, libellés d’incertitude et revue humaine. |
| Besoin supposé présenté comme certain | Séparation visible entre observation, interprétation et hypothèse ; brouillon bloqué si sa personnalisation repose sur des faits non vérifiés. |
| Doublons et usure de la prospection | Historique, avertissement sur URL/identifiant déjà traité, aucun envoi prospect. |
| Envoi à un mauvais destinataire | Adresse personnelle fixée côté serveur, contrôle d’égalité strict, action manuelle et journal d’envoi. |
| Fuite de secrets ou de données | Variables d’environnement hors dépôt, aucun secret côté client, journalisation minimale et données de test limitées. |
| Source changeante ou inaccessible | Date de consultation, état d’accès, incertitude affichée, possibilité de relancer le test. |
| Coûts ou dépendance à un service externe | Aucun service branché pendant le cadrage ; fournisseurs et plafonds choisis avant activation. |
| Complexité prématurée | Un seul flux manuel, composants et adaptateurs simples, pas de planificateur ni d’orchestration d’agents au MVP 0. |

## 13. Hypothèses et questions ouvertes

### Hypothèses de travail

- Le produit sert d’abord une seule personne et peut être exécuté en local pour le MVP 0.
- Les premiers tests porteront sur quelques associations choisies manuellement, avec des pages publiques ou des informations fournies par l’utilisateur.
- L’analyse IA et l’e-mail nécessiteront des services externes distincts ; leur activation attend un choix et un accord explicites.
- `X` et `Y` seront configurables au MVP 2 ; ils n’influencent pas le lancement manuel du MVP 0.

### Questions à trancher avant les étapes concernées

1. **Avant la connexion de services :** quel fournisseur d’IA, quel fournisseur d’e-mail et quelles limites de coût/données sont acceptables ?
2. **Avant le premier envoi de test :** quelle adresse personnelle unique utiliser et quelle identité d’expéditeur autoriser ?
3. **Avant le choix définitif de stockage/authentification :** usage strictement local ou accès depuis plusieurs appareils / hébergement ?
4. **Pour valider la qualité réelle :** quelles 3 associations et quels critères représentatifs utiliser comme jeu d’essai ?
5. **Avant le MVP 2 :** quelles sources de découverte, quelle cadence `X`, quelle heure `Y` et quel fuseau ?
6. **Avant le MVP 3 :** quelles règles de validation humaine et quelles obligations applicables aux prises de contact ?

Aucune de ces réponses n’est nécessaire pour valider ce PRD. L’accord explicite de l’utilisateur est requis avant de commencer l’implémentation, conformément au brief.

## 14. Feuille de route par briques

| Brique | Livrable vérifiable | Condition de sortie |
| --- | --- | --- |
| 0A — Fondations | Structure Next.js/TypeScript, modèle de données, configuration locale, profil de critères et entrée manuelle | Un test peut être créé et retrouvé sans service externe. |
| 0B — Analyse sourcée | Collecte limitée, provenance, validation JSON, fiche, brouillon séparé | Les scénarios de qualité et d’absence d’invention passent sur le jeu d’essai. |
| 0C — Livraison de test | Prévisualisation et e-mail à adresse autorisée, journal et reprise | Dossier reçu sur la boîte personnelle et conforme à la fiche. |
| MVP 1 — Revue | File de fiches, validation/rejet, commentaire, motifs structurés, édition | Les décisions sont historisées et les motifs exploitables pour ajuster le ciblage. |
| MVP 2 — Quotidien | Découverte ciblée, enrichissement, dédoublonnage renforcé, sélection de `X`, planification à `Y`, notification | Une sélection reproductible arrive au rythme choisi, sans doublons examinés/contactés. |
| MVP 3 — Contact contrôlé | Brouillons par canal et préparation de relances ; action de contact uniquement après validation explicite | Aucun contact ne part sans décision humaine enregistrée et contrôles applicables. |

Chaque brique doit être validée sur des exemples réels avant d’élargir l’automatisation.
