---
name: "Swipe & Prospect — prototype mobile provisoire"
description: "Relevé du prototype local prototypes/mobile ; ne vaut pas validation du produit connecté."
colors:
  canvas: "#14181d"
  paper: "#1b2229"
  ink: "#f2f0eb"
  muted: "#b2bcc6"
  blue: "#bad5ee"
  green: "#c7dbd1"
  green-hover: "#deeee6"
  action-ink: "#182722"
  pale: "#253b36"
  line: "#36414b"
  focus: "#efc87c"
  control-border: "#74818e"
  control-hover: "#2b3640"
  nav-active: "#283a40"
  stack: "#252e37"
  card-border: "#526674"
  card-blue: "#25445b"
  card-ink: "#f7f3ec"
  card-location: "#d0dfe8"
  card-green: "#284f48"
  card-slate: "#394253"
typography:
  body:
    fontFamily: '"Segoe UI Variable", "Aptos", "Segoe UI", sans-serif'
    fontSize: "16px"
    lineHeight: 1.5
  title:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  card-name:
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  card-headline:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "31px"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.025em"
  button:
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.5
  text-action:
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
rounded:
  nav-and-select: "8px"
  field: "9px"
  button: "10px"
  insight: "12px"
  card-and-shell: "16px"
spacing:
  field-gap: "8px"
  action-gap: "12px"
  compact-inset: "16px"
  narrow-card-inset: "20px"
  section-inset: "22px"
  screen-inset: "24px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.control-hover}"
  text-action:
    textColor: "{colors.blue}"
    typography: "{typography.text-action}"
    padding: "9px 0"
  field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px"
    width: "100%"
  prospect-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-and-shell}"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.nav-and-select}"
  nav-item-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.green}"
    rounded: "{rounded.nav-and-select}"
  insight:
    backgroundColor: "{colors.pale}"
    rounded: "{rounded.insight}"
    padding: "22px"
---

# Design System: Swipe & Prospect — prototype mobile provisoire

## Overview

Ce document décrit uniquement la maquette locale `prototypes/mobile/index.html`, dans son état du 20 octobre 2026. Ses tokens font référence pour reproduire cette maquette ; ils ne constituent ni une nouvelle identité de marque ni une approbation de l’UX de production. Sources : `prototypes/mobile/styles.css`, `index.html`, `app.js` et le contrat `docs/refonte-mobile/MAQUETTE.md`.

Rémi a demandé le 20 octobre une ambiance plus foncée et moderne inspirée de La Matinale. Le prototype adopte des surfaces charbon, des cartes bleu profond, vert sombre et ardoise, et des accroches à empattements. Ce n’est ni une reproduction de la marque du Monde ni une modification de l’ancien atelier. Le prototype est publié sur le domaine ; la PWA installable, le moteur de préparation et la synchronisation restent à développer.

**Key Characteristics:**

- Une proposition visible à la fois, avec décisions hors de la carte.
- Lecture alignée à gauche, corps de texte mobile et détails progressifs.
- Titres éditoriaux sur des surfaces sombres ; liens bleu clair et action Garder en vert très pâle.
- Mentions d’exemple et réserves présentes dans le parcours.

## Colors

### Primary

Le bleu clair porte les liens, distinct du bleu profond de la première carte. Garder utilise un vert très pâle avec une encre sombre ; le même accent signale la sélection et les retours d’action. Son survol éclaircit le bouton.

### Secondary

Les variantes vert sombre et ardoise distinguent les deux autres exemples. Leur attribution ne définit aucun statut, score ou secteur. Un fond vert sombre encadre l’explication « Pourquoi cette association ? ».

### Neutral

Le canevas charbon entoure le téléphone de présentation ; la surface ardoise porte l’application et le corps des cartes. L’encre claire structure le texte principal, le gris bleuté les informations secondaires. Les traits séparent sections et navigation. Le ton de pile forme le décalage sous la carte et le bandeau de maquette. Le focus utilise un ambre clair dédié.

Les valeurs `muted` et `focus` sont celles du prototype ; elles diffèrent des tokens de même rôle dans l’application existante. Aucun nuancier intermédiaire n’a été mesuré ni généré pour ce relevé.

## Typography

Le texte et les contrôles utilisent Segoe UI Variable, Aptos, Segoe UI, puis sans-serif. Les titres de page, de dossier, de présentation et les accroches de carte utilisent Georgia, Times New Roman, puis serif. Aucun fichier de police n’est livré ; le rendu dépend des polices disponibles sur l’appareil.

Le corps reste à 16 px. Les titres de page sont à 28 px ; le nom de l’association puis la raison de la proposition forment deux niveaux distincts. Sous 370 px, la raison passe de 31 à 27 px. Le titre de dossier atteint 34 px. Les liens d’action et les précisions utilisent 14 px ; les avertissements courts et libellés de navigation, 12 px. Les compteurs emploient des chiffres tabulaires.

## Layout

Sur téléphone, l’application occupe la largeur disponible avec en-tête, bandeau de maquette, contenu, retour d’action et navigation inférieure. Le contenu reçoit normalement 24 px de marge intérieure ; sous 370 px, les côtés passent à 16 px et les blocs de carte à 20 px. Les deux choix sont en colonnes de proportions 1 / 1,25, séparées de 12 px. Les boutons ont une hauteur minimale de 50 px ; les accès textuels, sélecteurs et retours, 44 px.

Au-dessus de 760 px, une colonne de notes accompagne une application de 440 px dans un conteneur plafonné à 1160 px. Cette enveloppe est un support de revue du prototype, pas une interface ordinateur approuvée pour le produit. À 960 px, son espacement se resserre. Sous 760 px, les notes disparaissent et le cadre arrondi laisse place à une application pleine largeur. La navigation reste collante en bas et tient compte de la zone sûre ; le dossier se lit verticalement.

## Elevation & Depth

Aucune ombre n’est utilisée dans cette maquette. La profondeur vient du fond décalé derrière la carte, de ses contours et des changements de surface. Le glissement applique une translation et une légère rotation à la carte ; le retour possède une transition de 200 ms. La préférence de réduction des animations supprime les transitions CSS. Le déplacement lié au pointeur demeure direct dans le script : ce relevé ne certifie pas une suppression de tout mouvement.

## Shapes

Les angles sont modérément arrondis : navigation et sélecteurs, champs, boutons, encadré explicatif puis carte et cadre suivent les rayons du frontmatter. Les cartes rognent leur contenu aux coins. Les séparations de dossier et de liste sont des traits fins ; aucune collection de pastilles ou d’étiquettes n’est implémentée.

## Components

### Buttons

Garder utilise un fond vert très pâle, du texte sombre et une icône signet ; Passer utilise la surface sombre, un contour gris bleuté et une croix. Les deux déclenchent les mêmes décisions que le glissement. Le survol modifie le fond. Les liens-boutons bleu clair sont soulignés ; l’annulation est plus discrète, centrée et atténuée quand indisponible. Le focus visible commun est un contour de 3 px décalé de 4 px. Aucun état pressé spécifique n’est défini.

### Cards / Containers

La carte associe un en-tête coloré sombre (identité, implantation, raison) et un corps charbon (observation, piste, réserve, accès au dossier). Les choix restent à l’extérieur. Les éléments de sélection sont une liste séparée par des traits, sans reproduire le panneau coloré. La fin des propositions et la sélection vide disposent d’un titre, d’une explication et d’une action.

### Inputs / Fields

Les champs ont un fond charbon, un contour gris bleuté et un libellé visible au-dessus. Le brouillon est une zone redimensionnable verticalement, d’au moins 200 px de haut. Le suivi utilise un sélecteur natif sombre, limité à 60 % de la ligne du libellé. La validation du formulaire d’exemple repose sur les contrôles natifs `required` et URL ; aucun traitement visuel d’erreur personnalisé n’est implémenté.

### Navigation

Trois boutons avec icône et texte : Propositions, Ma sélection et Plus. La page courante est identifiée par `aria-current`, un fond vert ardoise et du texte vert clair. Dans le dossier, l’onglet d’origine reste courant ; le retour rejoint cet écran. Le lien d’évitement et le déplacement du focus vers le contenu sont implémentés. Aucun menu latéral mobile n’est présent.

### Dossier and feedback

Le dossier expose d’abord la raison, puis les observations, références dépliables, intervention, réserves et brouillon. Les sources et dates restent explicites. Le retour d’action est annoncé dans une région de statut. Limite connue : un message de succès peut remplacer l’avertissement de stockage indisponible. Les extraits du sidecar reproduisent l’apparence ; ils ne portent ni navigation ni persistance.

## Do's and Don'ts

### Do:

- Do conserver les mentions de maquette, les dates des exemples et les réserves dans les écrans concernés.
- Do garder les deux choix accessibles par bouton en plus du glissement.
- Do utiliser les tokens du prototype pour prolonger cette maquette, puis revalider le système avant son intégration au produit.

### Don't:

- Don't présenter ce relevé comme une identité de marque ou une UX de production approuvée.
- Don't donner aux variantes colorées des cartes une signification de statut absente du prototype.
- Don't annoncer installation, mode hors connexion, synchronisation ou envoi de message comme déjà disponibles.
