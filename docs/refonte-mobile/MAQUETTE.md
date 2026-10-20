# Maquette mobile — brief de réalisation

Mode : Operate. Cible : `prototypes/mobile/index.html`. Périmètre : prototype local de navigation, sans service connecté. Les écrans mettent à l’épreuve le parcours confirmé, pas la qualité actuelle du moteur.

## Direction contract

THESIS : une association à la fois, avec un constat et une première aide possibles. La sélection se construit en parcourant des dossiers préparés, comme dans le parcours de La Matinale confirmé par Rémi.

OWN-WORLD : reprise de la famille existante : fond clair #f4f8f8, blanc #ffffff, encre #17323d, bleu #175a75, vert d’action #117968, traits #d9e5e7. Typographie de travail Segoe UI Variable / Aptos. Alignement à gauche ; carte de contenu unique, navigation et choix hors de son contenu.

STORY : comprendre l’association, lire le signal, découvrir une piste ; garder ou passer, puis approfondir depuis sa sélection. Les trois exemples et leurs limites restent identifiés sur tous les écrans.

FIRST VIEWPORT : nom du produit et mention de maquette, compteur de progression, carte avec identité et signal, lien de lecture puis boutons Passer / Garder, navigation inférieure. À 390 px, texte principal 16 px et cibles tactiles d’au moins 44 px ; le dossier déploie les détails progressivement.

FORM : pile de cartes mobile, structure directement fixée par la référence utilisateur, priorité sur les alternatives du tirage de surface e6d5c901. Le tirage était dégradé et ne fournit aucune planche qualité ; il ne constitue pas une validation utilisateur. Prototype construit directement pour examiner les interactions, sans décision globale enregistrée sur le mode de génération d’images.

FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Interaction signature

Le glissement horizontal accompagne la décision ; les boutons réalisent exactement la même action. L’annulation restaure le dernier choix. Le défilement vertical du contenu reste possible. Le mouvement respecte la préférence de réduction des animations.

## États et périmètre

- Propositions : une carte, progression, fin de sélection, annulation.
- Sélection : vide ou dossiers gardés, changement explicite du suivi.
- Dossier : retour au bon écran, preuves et réserves, premier livrable, brouillon révisable et copiable.
- Plus : explication de l’ajout manuel facultatif, réinitialisation des exemples du prototype.
- Les choix et brouillons exemples sont conservés dans ce navigateur. Aucun appel IA, aucune connexion Turso et aucun envoi d’e-mail.
- La PWA réelle et sa synchronisation interappareils restent à implémenter. Cette maquette n’est pas présentée comme installable ou utilisable hors connexion.

## Données d’illustration

KoToPo reprend le dossier fourni par Rémi, daté du 11 octobre 2026. Anciela et Artis MBC reprennent les dossiers exemples du projet du 28 septembre 2026. Les interventions sont des propositions de démonstration, à confirmer ; les liens sont des références à reconsulter, pas des preuves collectées aujourd’hui.

La hiérarchie, les mots et les gestes sont à valider. La cadence de préparation, le budget, la fraîcheur et la réapparition des cartes ne sont pas décidés par la maquette.

## Revue du prototype

Une revue indépendante du code et des quatre captures (propositions mobile et ordinateur, sélection mobile, début du dossier mobile) conclut que le prototype peut être présenté pour validation, sans blocage matériel dans ce périmètre. Cette conclusion ne couvre ni le moteur IA, ni l’installation PWA, ni la production.

Observation mineure à reprendre lors du branchement réel : si le stockage du navigateur est bloqué, une confirmation d’action peut remplacer le message d’indisponibilité. Les données de la visite restent utilisables, mais la persistance doit être annoncée plus durablement dans ce cas. Le pilote connecté devra couvrir ce scénario avec la synchronisation serveur.

Les captures de référence sont conservées dans `.impeccable/review/`. Les composants et couleurs effectivement utilisés sont documentés séparément dans `DESIGN.md` et `.impeccable/design.json` ; cela ne vaut pas validation définitive de l’identité ou des écrans de production.
