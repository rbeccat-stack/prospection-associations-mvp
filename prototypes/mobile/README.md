# Maquette mobile de Swipe & Prospect

Prototype de parcours autonome, préparé le 20 octobre 2026, désormais ouvert depuis l’accueil du site. Ses exemples n’utilisent ni la base de données, ni l’IA, ni l’e-mail. Les dossiers de la première version restent dans l’espace `/atelier`.

## Consultation

Sur le site déployé : l’adresse principale ouvre désormais `/apercu`, avec le même accès privé que l’application. Cette adresse peut être ouverte depuis un téléphone et sur tout domaine déjà relié au projet Vercel. Les trois fichiers sont servis par une route dédiée ; les outils et documents de ce répertoire ne sont pas exposés. L’ancien tableau de bord reste accessible sur `/atelier`, depuis le lien dans « Plus ».

Pour un aperçu local indépendant de Next.js, depuis la racine du projet : `node prototypes/mobile/serve.mjs`, puis ouvrir `http://127.0.0.1:4173/` sur cet ordinateur. Le serveur écoute uniquement en local et ne sert que les trois fichiers de la maquette. Ce lien local n’est pas accessible depuis un autre téléphone.

Les quatre fichiers HTML, CSS, JS et README peuvent aussi être conservés ensemble ; un navigateur peut ouvrir `index.html` pour examiner les écrans. La conservation locale dépend des règles du navigateur, surtout sur une URL de fichier.

## Parcours à essayer

1. Ouvrir directement les propositions.
2. Garder ou passer une carte, avec les boutons ou un glissement horizontal.
3. Annuler le dernier choix.
4. Retrouver une association dans « Ma sélection », puis changer sa prochaine étape.
5. Ouvrir le dossier, lire la piste, le premier livrable, les réserves et les références datées.
6. Modifier un brouillon et le retrouver en rouvrant le dossier. La copie ne déclenche aucun envoi.
7. Dans « Plus », examiner l’entrée manuelle facultative et recommencer avec les trois exemples.

Les choix et brouillons sont conservés dans ce navigateur seulement. Le bouton de réinitialisation efface uniquement les données de démonstration propres à cette maquette.

## Limites à garder visibles

Les trois associations sont de vrais noms tirés des documents existants, mais les dossiers n’ont pas été recollectés aujourd’hui. KoToPo illustre un angle décrit dans le dossier fourni par Rémi ; Anciela et Artis montrent des pistes exploratoires qui ne rempliraient pas, sans preuves supplémentaires, le futur critère de publication d’une carte.

La recherche automatique, les analyses réelles, la synchronisation Turso, la PWA installable, le mode hors connexion et l’envoi aux associations ne font pas partie de ce prototype.

## Vérifications réalisées

Dans le navigateur : choix par bouton, glissement horizontal, annulation, fin de sélection, suivi dans la sélection, références dépliables, modification et réouverture d’un brouillon, conservation du suivi après rechargement et remise à zéro des exemples.

Rendu inspecté à 390 × 844 et 1440 × 1000 ; absence de débordement horizontal à 390 px, boutons mesurés à au moins 44 px. Syntaxe JS et serveur vérifiées. Le détecteur d’interface ne relève aucun problème mécanique. Ces vérifications ne constituent pas un test du moteur IA, de l’authentification mobile ou de l’installation PWA.

Le cadrage cible se trouve dans `docs/refonte-mobile/CADRAGE.md` ; le brief de maquette et ses limites dans `docs/refonte-mobile/MAQUETTE.md`.
