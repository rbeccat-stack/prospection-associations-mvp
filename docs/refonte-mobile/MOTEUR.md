# Preuve du moteur — éditions tirées du Journal officiel

Palier 2 du [cadrage](CADRAGE.md), livré le 22 octobre 2026 : produire de vrais dossiers sans que Rémi saisisse d’URL, puis mesurer leur pertinence, les échecs et le coût. Les cartes mobiles ne sont pas encore branchées (palier 3).

## Source officielle et tirage

Le moteur interroge le [Journal officiel des associations et fondations d’entreprise](https://journal-officiel-datadila.opendatasoft.com/explore/dataset/jo_associations/) (DILA, données ouvertes). Chaque annonce donne le numéro RNA, l’objet déclaré, l’adresse actuelle, un ou plusieurs domaines d’activité de la nomenclature officielle et, parfois, un site web.

À chaque lancement, une catégorie est tirée au sort parmi les domaines précis (par exemple « chant choral, musique », « photographie, cinéma », « danse ») :

- périmètre : associations dont l’adresse actuelle est dans l’un des neuf arrondissements de Lyon et qui déclarent un site ;
- au moins cinq associations dans la catégorie ; les rubriques générales sans précision et « activités politiques » sont exclues ;
- la catégorie de l’édition précédente n’est pas retirée immédiatement.

Le 22 octobre 2026, 44 catégories remplissaient ces conditions. Environ 1 240 associations lyonnaises déclarent un site dans le Journal officiel, sur environ 21 700 associations lyonnaises présentes. Ce choix privilégie les associations créées ou modifiées récemment, car le champ « site » est surtout renseigné dans les annonces récentes.

## Sélection des candidates

Dans la catégorie tirée, le moteur garde une association par RNA (annonce la plus récente), écarte celles qui ont publié une dissolution, celles dont le site est un réseau social ou une page Linktree, celles déjà proposées dans une édition et celles déjà examinées à la main (même site). Il tire ensuite douze candidates au hasard, en écartant les sites dont le nom de domaine n’existe plus : lors de la première édition réelle, quatre sites déclarés sur neuf avaient disparu.

## Préparation pas à pas

Chaque appel serveur réalise une seule étape, pour rester sous la limite de durée des fonctions Vercel :

1. **Lecture du site** : page d’accueil, puis jusqu’à quatre pages internes choisies parmi ses liens (contact, adhésion, présentation, agenda ou activités, bénévolat ou dons). L’annonce du Journal officiel est ajoutée comme source. Un site illisible écarte la candidate **sans appel IA**.
2. **Analyse IA** : l’analyse existante, avec toutes ses vérifications de citations, contacts et sources. Une citation est comparée mot à mot : la casse, la ponctuation et le style des apostrophes ou guillemets sont ignorés (l’IA réécrit souvent « ’ » en « ' »). Si le passage exact figure dans une autre page collectée que celle indiquée, il est rattaché à cette page. Une citation absente de toutes les pages fait toujours rejeter l’analyse.

La collecte se connecte en IPv4 lorsque le site en propose une adresse (les fonctions Vercel ne joignent pas l’IPv6), accepte des pages jusqu’à 3 Mo et indique la cause d’un échec : domaine disparu, certificat invalide, site privé, connexion refusée.

Une édition s’arrête après **cinq analyses IA** (échecs compris) ou quand les candidates sont épuisées. La limite quotidienne `AI_DAILY_REQUEST_LIMIT` reste prioritaire : si elle est atteinte, l’édition se met en pause et reprend plus tard sans relire les sites. Un verrou empêche deux étapes simultanées ; un dossier déjà enregistré n’est jamais repayé.

## Carte prête ou retour en recherche

Un dossier devient « prêt » s’il contient au moins une intervention appuyée sur un fait vérifié, un signal observable et un fait tiré du site de l’association elle-même (l’annonce officielle seule ne suffit pas). Sinon, il retourne en recherche avec la raison affichée. Tous les dossiers restent consultables dans `/atelier` et `/tests/[id]`.

Le ciblage utilisé est le ciblage intégré du cadrage (Lyon, tous secteurs, offre de Rémi), enregistré comme une version de ciblage pour rester traçable.

## Ce qu’il faut mesurer pendant la preuve

- Part des sites lisibles, part des dossiers prêts, raisons des retours en recherche.
- Coût réel par édition : il est relevé dans le diagnostic de chaque analyse lorsque le fournisseur le communique (OpenRouter), et affiché dans le panneau.
- Pertinence jugée par Rémi sur les dossiers prêts : c’est le seul critère qui valide la qualité.

## Limites connues

- La préparation avance tant que la page `/atelier` reste ouverte ; la file serveur durable et la planification relèvent du palier 4.
- Les associations sans site déclaré au Journal officiel ne sont pas proposées ; une recherche web pourrait les couvrir plus tard, avec un fournisseur à choisir.
- Le Journal officiel ne signale pas toutes les associations devenues inactives : un site lisible et récent reste le meilleur indice d’activité.
