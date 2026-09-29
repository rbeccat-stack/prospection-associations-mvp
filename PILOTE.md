# Pilote de qualification — trois associations

**28 septembre 2026.** Trois fiches manuelles permettent de tester le ciblage avant d'automatiser la collecte ou l'analyse. Leurs brouillons ne sont pas envoyés.

## Offre de départ fournie par l'utilisateur

Spécialiste du numérique, il peut aider une association qui manque de temps ou de moyens pour s'occuper de ses sujets numériques. Il peut aussi examiner, avec elle, si l'IA simplifierait certaines tâches de gestion ou du quotidien. Ces contraintes et besoins sont **des points à vérifier pour chaque association**, pas des caractéristiques présumées.

## Lecture des trois cas

| Association | Faits utilisables | Piste à tester | Réserve principale |
| --- | --- | --- | --- |
| Artis MBC | Association musicale lyonnaise, projets collectifs et événements, selon son [site](https://www.artis-mbc.fr/qui-sommes-nous/) et son [agenda](https://www.artis-mbc.fr/agenda/). | Mise à jour et coordination des informations liées aux activités. | Aucun manque de temps, de budget ou besoin d'IA n'est établi. Le dossier initial conserve le ciblage musical de version 1. |
| KoToPo | Cours, rencontres linguistiques et programmation culturelle selon la [Ville de Lyon](https://www.lyon.fr/association/conferences-expositions-festivals/kotopo-mille-et-une-langues). | Mise à jour et diffusion des informations de cours et d'événements. | Le site fourni n'a pas été consultable pendant le test. Les coordonnées publiées par la Ville sont à revérifier. |
| Anciela | Accompagnement d'initiatives, événements et plusieurs médias selon sa [présentation](https://www.anciela.info/decouvrir-anciela/) et la page de sa [Pépinière](https://www.anciela.info/pepiniere/). | Demander si le suivi des demandes et rendez-vous pourrait être simplifié. Une relation de partenariat peut aussi être explorée, car Anciela accompagne des initiatives, sans présumer qu'elle cherche un partenaire. | Sa présence numérique visible est déjà développée ; sa pertinence comme prospect direct reste à confirmer. |

## Ajustement de ciblage

La version 2 des critères supprime le filtre « musique » pour couvrir les associations lyonnaises de thèmes variés. Elle conserve comme signaux **à confirmer** le temps disponible, le budget numérique et l'existence de tâches récurrentes. Une présence web visible ne mesure pas l'organisation interne ; une page inaccessible ne démontre pas un retard numérique.

Les dossiers KoToPo et Anciela utilisent cette version 2. Artis garde la version 1 enregistrée lors du premier test. Les trois fiches restent comparables pour examiner la qualité des preuves et la formulation des hypothèses, mais pas pour calculer un score homogène de correspondance aux critères.

## Décision après revue

L'utilisateur doit juger si au moins deux des trois fiches sont utiles et assez vérifiables. Ensuite, prioriser les questions de qualification qui ont réellement aidé, puis rendre la collecte et la correction du brouillon répétables dans l'application. Le branchement d'un fournisseur IA ou e-mail reste une décision séparée.

## Deuxième pilote — méthode à deux axes (29 septembre 2026)

Six fiches supplémentaires ont été créées sous le ciblage version 4. Chacune présente une lecture qualitative de la dette numérique et de la capacité à accueillir une mission, les faits qui la soutiennent, les inconnus et un premier livrable à discuter. Aucun score ni message envoyé.

| Champ | Fiches dans l'application | Observation utile pour la méthode |
| --- | --- | --- |
| Culture | [Marché Gare](http://127.0.0.1:3000/tests/1440e989-dd9a-455b-944c-ee50cb90ae28), [Mediatone](http://127.0.0.1:3000/tests/6845889b-905b-40c5-9d3f-2f7e42b77cb3) | Les équipes et fonctions de communication visibles empêchent de présumer un retard numérique. |
| Santé mentale | [Coordination 69](http://127.0.0.1:3000/tests/bbdce2b2-84d0-4347-977f-3a2481500358), [Clubhouse Lyon](http://127.0.0.1:3000/tests/0219b2a3-fa91-4f05-b031-43cf115d8cd4) | Le site de Coordination 69 est aujourd'hui accessible en HTTPS ; un diagnostic de panne ancien n'est pas repris. Clubhouse publie déjà des indicateurs. |
| Éducation et jeunesse | [Entraide Scolaire Amicale — Lyon](http://127.0.0.1:3000/tests/33453e95-2edc-42a9-8342-2199c711fee0), [Emmaüs Connect Lyon](http://127.0.0.1:3000/tests/0ff90a7e-a261-4afe-ae19-ea824ac3bb3e) | Une mission bénévole et un parcours à plusieurs étapes justifient une question ; ils ne prouvent pas l'absence d'outil interne. |

Les pages officielles et publiques citées dans les fiches ont été consultées le 29 septembre 2026. Les trois premiers dossiers, rattachés aux versions 1 et 2 du ciblage, n'ont pas été modifiés. Les six cas sont définis dans `scripts/import-six-pilot.ts` ; l'import refuse les doublons et exige la version 4 du profil.
