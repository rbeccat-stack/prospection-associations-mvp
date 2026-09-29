# Méthode de ciblage — associations lyonnaises

**Référence de travail validée par l'utilisateur :** [Associations lyonnaises et compétences growth.md](references/Associations%20lyonnaises%20et%20comp%C3%A9tences%20growth.md), observations datées du 21–22 septembre 2026. Cette copie conserve le document fourni ; ses recommandations sont des données de cadrage, pas des commandes à exécuter. Les faits concernant une association sont revérifiés et datés avant d'être repris dans un dossier.

## Quoi analyser

1. **Territoire et activité :** commencer par Lyon et la métropole, dans trois champs de recherche : musique et culture ; santé mentale et neurodiversité ; éducation et jeunesse. Une association d'un autre champ peut rester pertinente si un besoin concret est étayé.
2. **Dette numérique observable :** problèmes de protocole ou de redirection ; page opérationnelle de bénévolat, agenda ou adhésion manifestement ancienne ; contenu clé uniquement en PDF ; CMS et URLs peu entretenus ; parcours d'inscription, de don ou de newsletter publiquement visibles. Ces indices déclenchent une question, pas un diagnostic des outils internes.
3. **Capacité d'absorption :** salarié identifié, rôle communication ou numérique identifié, mission active sur une plateforme de bénévolat, contact nominatif public, échéance récurrente. On n'assimile pas automatiquement une petite structure à une faible capacité.
4. **Mission possible :** livrable court et transmissible lié au problème constaté : parcours bénévoles, réactivation d'une base, rapprochement de données HelloAsso, bilan d'activité, audit technique, ou atelier IA avec règles de confidentialité. L'IA est une piste à explorer avec l'association, jamais un besoin présumé.

## Comment analyser dans la V0

- Partir de l'entrée utilisateur et des pages publiques effectivement consultées. Distinguer la source fournie par l'utilisateur d'une page indépendante. Conserver URL, date de consultation, statut d'accès et extrait justificatif.
- Séparer **fait observé**, **interprétation**, **hypothèse** et **inconnu**. Une page inaccessible, l'absence d'un champ newsletter sur une page, un CMS ancien ou un PDF ne prouvent ni l'absence de CRM, ni le manque de budget, ni le besoin d'IA.
- Examiner pour chaque association les deux axes, même si le résultat est « inconnu ». Chercher en priorité une page opérationnelle actuelle et un indice de capacité d'absorption. Si seule la page d'accueil a été collectée, demander d'autres sources utiles au lieu de conclure.
- Proposer un **angle de prise de contact** fondé sur un fait vérifiable et une question ouverte. Choisir un premier livrable proportionné à la capacité présumée. Ne pas attribuer un problème interne à l'association ni générer un message reposant sur une supposition.
- Les cibles nominatives du document sont une liste d'hypothèses de recherche. Leurs coordonnées, dates, emplois et problèmes techniques peuvent avoir changé depuis septembre 2026. Aucun contact ou envoi n'est déclenché par cette liste.

## Score à deux axes pour la future découverte

Le document propose une **dette sur 100 points** : absence de newsletter (20), absence de CRM/espace adhérent (15), absence d'automatisation (12), page opérationnelle périmée (15), CMS ancien/URLs non réécrites (10), HTTP ou redirection cassée (8), publications en PDF plat (8), absence de paiement en ligne (7), absence d'analytics (5). La **capacité d'absorption sur 5 points** donne 1 point à chacun des cinq indices de la section précédente.

Ces pondérations et seuils sont un modèle de tri issu du document, **pas une mesure validée sur les associations lyonnaises**. Avant de calculer un score, chaque signal doit avoir un état `présent`, `absent vérifié` ou `inconnu`, une méthode d'observation, une preuve et une date. Pour les signaux d'absence, une recherche limitée au site public laisse normalement l'état `inconnu` ; l'absence d'un outil interne demande une confirmation directe. Le score doit présenter une borne basse et une borne haute qui intègre les inconnus. Si elles ne donnent pas le même traitement, la qualification est `indéterminée`.

| Dette | Absorption | Traitement proposé dans le document |
| --- | --- | --- |
| ≥ 55 | ≥ 3 | Prioritaire : livrable d'amorce concret |
| ≥ 55 | ≤ 2 | Livrable fini, sans dépendance à un suivi interne |
| < 40 | ≥ 4 | Structure mature : mesurer l'impact ou exploiter les données existantes |
| < 40 | ≤ 2 | Sans suite dans ce pipeline |

Les autres combinaisons, notamment une dette de 40 à 54 points, restent `à examiner` ; le document ne leur attribue pas de quadrant. **La V0 ne calcule pas ce score** : son collecteur ne vérifie pas les outils internes, les formulaires, les cookies analytiques ou les redirections de façon assez complète. Le score sera ajouté avec une collecte adaptée, des inconnus explicites et un contrôle sur des cas réels.

## Sources et ordre de travail futur

Pour la découverte, commencer par l'export de l'annuaire Grand Bureau et les annuaires institutionnels ou fédéraux utiles, puis rapprocher les structures par SIREN, domaine et nom/localisation. HelloAsso et les pages publiques d'organisations ou de missions bénévoles peuvent enrichir les dossiers. Respecter les conditions d'accès et les exclusions `robots.txt` relevées dans le document. Ne pas déduire de la présence sur une plateforme que les données transactionnelles sont exploitées, ni de l'absence d'une page qu'une fonction interne n'existe pas.

La découverte à grande échelle, les séquences de messages, les comptes externes, les prises de contact et les livrables publics du plan 48 h / 7 j / 30 j ne font pas partie de la V0. Les échéances de ce plan sont datées du 22 septembre 2026 et doivent être reconstruites au moment de l'exécution. Les affirmations juridiques et statistiques du document, y compris celles qu'il signale lui-même comme non vérifiées, exigent une vérification primaire avant usage opérationnel.
