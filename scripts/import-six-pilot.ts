import { randomUUID } from 'node:crypto';
import { dossierSchema, type Dossier, type TestInput } from '../src/lib/schemas';
import { createRuns, findDuplicates, getDb, getLatestProfile, saveDossier } from '../src/lib/store';

type Fact = { text: string; source: number; quote: string };
type Pilot = {
  name: string;
  url: string;
  location: string;
  locationSource: number;
  activity: string;
  theme: string;
  summary: string;
  sources: { url: string; label: string }[];
  facts: Fact[];
  debt: { assessment: string; factIndexes: number[]; unknowns: string[] };
  absorption: { assessment: string; factIndexes: number[]; unknowns: string[] };
  firstDeliverable: string;
  rationale: string;
  toVerify: string[];
  reservations: string[];
  confidence: 'low' | 'medium' | 'high';
};

// Pages publiques consultées le 29 septembre 2026. Les faits sont des extraits bornés ;
// les propositions de mission restent des hypothèses à discuter avec chaque structure.
export const pilots: Pilot[] = [
  {
    name: 'Marché Gare', url: 'https://marchegare.fr/association', location: 'Lyon 2e', locationSource: 2,
    activity: 'Musiques actuelles, concerts et action culturelle', theme: 'musique et culture',
    summary: 'Marché Gare porte une activité de musiques actuelles à Lyon, avec une équipe salariée et bénévole. Les pages consultées montrent déjà des fonctions de communication et de newsletter.',
    sources: [
      { url: 'https://marchegare.fr/association', label: 'Marché Gare — association' },
      { url: 'https://marchegare.fr/le-marche-gare/lequipe', label: 'Marché Gare — équipe' },
      { url: 'https://marchegare.fr/infos-pratiques/contacts', label: 'Marché Gare — contacts' },
    ],
    facts: [
      { source: 0, text: 'L’association se consacre notamment aux musiques actuelles et à la création, la diffusion et la médiation.', quote: 'notamment dans le domaine des musiques actuelles amplifiées' },
      { source: 0, text: 'Marché Gare décrit une équipe bénévole active chaque saison.', quote: "une équipe bénévole très active dans la vie de l'association" },
      { source: 1, text: 'L’équipe présente un poste couvrant communication, partenariats et billetterie.', quote: 'Communication, partenariats, billetterie et programmations alternatives' },
      { source: 2, text: 'La page de contact propose une inscription à la newsletter.', quote: 'Inscription à la newsletter' },
      { source: 2, text: 'La salle indique son adresse au 4-6 place Hubert Mounier, 69002 Lyon.', quote: '4-6 Place Hubert Mounier' },
    ],
    debt: { assessment: 'Aucune dette numérique interne n’est démontrée. La newsletter et la billetterie sont déjà visibles ; le sujet pertinent serait une amélioration ciblée du parcours bénévole, si l’équipe constate une friction.', factIndexes: [2, 3], unknowns: ['Outils utilisés pour suivre candidatures, créneaux et bénévoles.', 'Temps réellement consacré aux ressaisies et aux relances.'] },
    absorption: { assessment: 'Des salariés, un rôle communication et une équipe bénévole sont identifiés : il existe des interlocuteurs possibles pour cadrer une mission courte.', factIndexes: [1, 2], unknowns: ['Disponibilité d’un référent pour un essai et une passation.', 'Priorité accordée à ce sujet par l’association.'] },
    firstDeliverable: 'Cartographier sur une page le parcours candidature bénévole → premier créneau et proposer un seul point de simplification.',
    rationale: 'L’équipe bénévole et le poste communication sont documentés ; le besoin d’amélioration doit être confirmé auprès d’eux.',
    toVerify: ['Comment les candidatures et les plannings bénévoles sont-ils suivis aujourd’hui ?', 'Qui pourrait tester et reprendre un livrable court ?'],
    reservations: ['Le document de référence citait une ancienne page bénévole ; les pages actuelles montrent aussi une équipe et une newsletter.', 'Aucun manque de temps ou de budget n’est établi.'], confidence: 'medium',
  },
  {
    name: 'Mediatone', url: 'https://mediatone.net/association/', location: 'Lyon 1er', locationSource: 0,
    activity: 'Production de concerts, festivals et accompagnement artistique', theme: 'musique et culture',
    summary: 'Mediatone est une association culturelle lyonnaise dotée d’une équipe permanente, de fonctions web et d’un important collectif bénévole. Ce cas sert à tester la méthode sur une structure déjà outillée.',
    sources: [
      { url: 'https://mediatone.net/association/', label: 'Mediatone — association et équipe' },
      { url: 'https://mediatone.net/benevoles/', label: 'Mediatone — bénévolat' },
    ],
    facts: [
      { source: 0, text: 'Mediatone organise des concerts et accompagne des artistes depuis 1997.', quote: 'Depuis 1997, Mediatone organise des concerts et accompagne des artistes' },
      { source: 0, text: 'Le site annonce 14 salariés permanents et plus de 350 bénévoles.', quote: '14 salarié·es permanent·es et plus de 350 bénévoles' },
      { source: 0, text: 'L’équipe affiche des fonctions de communication web et de webmaster.', quote: 'Webmaster, Chargé de Production Vidéo et Communication Web' },
      { source: 1, text: 'Les bénévoles contribuent à l’organisation des concerts et à la vie associative.', quote: 'aident à l’organisation des concerts et participent à la vie de l’association' },
      { source: 0, text: 'Le site donne une adresse rue des Capucins à Lyon.', quote: '25 & 29 rue des Capucins' },
    ],
    debt: { assessment: 'Aucune dette numérique de base n’est établie ; des fonctions web internes sont visibles. Une proposition devrait viser la mesure ou la coordination d’une activité précise, après confirmation d’un besoin.', factIndexes: [2, 3], unknowns: ['Outils de coordination bénévoles et de suivi des événements.', 'Indicateurs déjà suivis et éventuels doublons de saisie.'] },
    absorption: { assessment: 'L’équipe permanente, les fonctions web et le collectif bénévole rendent plausible une collaboration cadrée avec un référent.', factIndexes: [1, 2], unknowns: ['Temps disponible d’un responsable et intérêt pour une aide extérieure.', 'Périmètre sur lequel Mediatone souhaite garder la main.'] },
    firstDeliverable: 'Proposer une maquette d’un tableau de bord agrégé sur un seul festival ou une campagne bénévole.',
    rationale: 'Le volume de bénévoles et d’événements est public, mais les outils et indicateurs existants ne le sont pas.',
    toVerify: ['Quels indicateurs de bénévolat ou d’événement sont déjà disponibles ?', 'Une équipe interne souhaite-t-elle tester une visualisation sur un périmètre limité ?'],
    reservations: ['Ne pas proposer une refonte web ou un CRM sans connaître les outils existants.', 'Les chiffres publiés sur le site ne renseignent pas la charge de gestion interne.'], confidence: 'medium',
  },
  {
    name: 'Coordination 69', url: 'https://www.coordination69.asso.fr/fr/', location: 'Rhône et Métropole de Lyon', locationSource: 0,
    activity: 'Réseau d’acteurs de la santé mentale', theme: 'santé mentale et neurodiversité',
    summary: 'Coordination 69 anime un réseau de santé mentale dans le Rhône et la Métropole. Son site est accessible en HTTPS lors de cette revue et présente des lettres d’information ainsi qu’une commission communication.',
    sources: [
      { url: 'https://www.coordination69.asso.fr/fr/', label: 'Coordination 69 — accueil' },
      { url: 'https://www.coordination69.asso.fr/fr/notre-reseau/la-gouvernance/', label: 'Coordination 69 — gouvernance' },
    ],
    facts: [
      { source: 0, text: 'Coordination 69 se présente comme un réseau de santé mentale du Rhône et de la Métropole de Lyon.', quote: 'Réseau de santé mentale, l’association regroupe la majorité des établissements publics' },
      { source: 0, text: 'La page d’accueil répertorie des lettres d’information, dont la n°45 datée de juin-juillet 2024.', quote: 'Lettre d’information n°45 – Juin/Juillet 2024' },
      { source: 1, text: 'La gouvernance indique une commission Communication.', quote: 'Communication' },
      { source: 1, text: 'Les commissions sont ouvertes aux professionnels, bénévoles et personnes concernées.', quote: 'commissions ouvertes à tous les professionnels, bénévoles et personnes concernées' },
    ],
    debt: { assessment: 'Le site consulté est accessible en HTTPS et montre des lettres d’information. La liste visible s’arrête à 2024 : cela invite à vérifier la fraîcheur du contenu public, sans conclure à une panne ni à l’absence d’outils.', factIndexes: [1], unknowns: ['Existence de publications plus récentes sur d’autres canaux.', 'Processus interne de publication et d’envoi de la lettre.'] },
    absorption: { assessment: 'Une commission communication et des commissions ouvertes constituent des points d’entrée organisationnels possibles.', factIndexes: [2, 3], unknowns: ['Référent actuel pour le site et son temps disponible.', 'Priorités numériques décidées par le réseau.'] },
    firstDeliverable: 'Préparer un inventaire daté d’une page des contenus publics à actualiser, puis le faire valider par la commission communication.',
    rationale: 'Les lettres listées et la commission communication sont visibles ; l’état réel du dispositif éditorial doit être demandé.',
    toVerify: ['La liste des lettres du site est-elle tenue à jour ailleurs ?', 'Qui pilote actuellement les contenus publics et selon quel calendrier ?'],
    reservations: ['La boucle de redirection décrite dans le document fourni n’a pas été reproduite : ne pas la reprendre comme fait actuel.', 'Aucune faiblesse de sécurité ou absence de newsletter n’est établie.'], confidence: 'medium',
  },
  {
    name: 'Clubhouse Lyon', url: 'https://www.clubhousefrance.org/nos-implantations/clubhouse-lyon/', location: 'Villeurbanne', locationSource: 0,
    activity: 'Entraide, insertion sociale et professionnelle en santé mentale', theme: 'santé mentale et neurodiversité',
    summary: 'Le Clubhouse de Lyon, situé à Villeurbanne, publie des résultats d’activité pour 2025 et propose un rapport annuel. Le cas teste une offre orientée mesure d’impact plutôt que présence numérique de base.',
    sources: [{ url: 'https://www.clubhousefrance.org/nos-implantations/clubhouse-lyon/', label: 'Clubhouse France — implantation Lyon' }],
    facts: [
      { source: 0, text: 'Le Clubhouse de Lyon accompagne des parcours d’autonomie, d’inclusion et de rétablissement.', quote: 'parcours favorisant l’autonomie, l’inclusion et le rétablissement' },
      { source: 0, text: 'La page indique 352 membres actifs en 2025.', quote: 'membres actifs au Clubhouse de Lyon en 2025' },
      { source: 0, text: 'La page affiche un taux d’insertion professionnelle de 50 % en 2025.', quote: 'de taux d’insertion professionnelle en 2025' },
      { source: 0, text: 'Un rapport annuel est proposé depuis la page de l’implantation.', quote: 'Lire le rapport annuel' },
      { source: 0, text: 'La page situe le Clubhouse au 16 rue d’Inkermann à Villeurbanne.', quote: "16 Rue d'Inkermann, 69100 Villeurbanne" },
    ],
    debt: { assessment: 'Aucune dette numérique observable n’est démontrée. Des résultats chiffrés et un rapport annuel existent déjà ; une aide éventuelle porterait sur leur production ou leur lecture, si l’équipe en exprime le besoin.', factIndexes: [1, 2, 3], unknowns: ['Outils de collecte et de consolidation des indicateurs.', 'Temps de préparation du rapport et qualité des données disponibles.'] },
    absorption: { assessment: 'La publication d’indicateurs suggère un interlocuteur sur la mesure d’impact, sans établir la disponibilité de l’équipe locale.', factIndexes: [1, 2, 3], unknowns: ['Responsable local de la mesure et disponibilité pour un pilote.', 'Accès autorisé à des données agrégées seulement.'] },
    firstDeliverable: 'Maquetter une page de lecture des indicateurs publics 2025, sans données de membres individuelles.',
    rationale: 'Les indicateurs publics permettent une maquette autonome ; toute analyse de données internes demanderait un accord spécifique.',
    toVerify: ['Quels indicateurs sont les plus utiles à l’équipe locale ?', 'Le reporting actuel nécessite-t-il une amélioration concrète ?'],
    reservations: ['Aucun accès à des données individuelles de santé ou de bénéficiaires n’est nécessaire pour ce pilote.', 'Les chiffres publics ne prouvent pas l’existence d’une difficulté de reporting.'], confidence: 'medium',
  },
  {
    name: 'Entraide Scolaire Amicale — Lyon', url: 'https://www.jeveuxaider.gouv.fr/missions-benevolat/18077/benevolat-entraide-scolaire-amicale-105', location: 'Lyon', locationSource: 0,
    activity: 'Mentorat et accompagnement scolaire', theme: 'éducation et jeunesse',
    summary: 'Une mission publique recherche un co-responsable d’antenne à Lyon. Elle décrit le recrutement des bénévoles, les demandes des familles et l’appui d’une équipe de co-responsables.',
    sources: [
      { url: 'https://www.jeveuxaider.gouv.fr/missions-benevolat/18077/benevolat-entraide-scolaire-amicale-105', label: 'JeVeuxAider — mission co-responsable à Lyon' },
      { url: 'https://entraidescolaireamicale.org/agir-avec-nous/devenir-benevole/devenir-mentor/', label: 'E.S.A — parcours pour devenir mentor' },
    ],
    facts: [
      { source: 0, text: 'Une mission de co-responsable d’antenne est publiée pour Lyon.', quote: 'devenez coresponsable à Lyon' },
      { source: 0, text: 'La mission comprend le recrutement des bénévoles et la réception des demandes des familles.', quote: 'il recrute les bénévoles, reçoit les demandes des familles' },
      { source: 0, text: 'Le futur responsable sera épaulé par des co-responsables et un responsable national.', quote: "épaulée par l'équipe des co-responsables et le responsable national" },
      { source: 1, text: 'Le parcours mentor public décrit un premier contact, un entretien et une rencontre avec l’enfant.', quote: 'Les 3 étapes' },
    ],
    debt: { assessment: 'Les étapes de recrutement et de mise en relation sont décrites, mais aucun retard numérique ni outil manquant n’est prouvé. Une cartographie de ce parcours peut révéler une amélioration utile.', factIndexes: [1, 3], unknowns: ['Outils existants pour les candidatures, familles et binômes.', 'Volume local et points de friction réellement rencontrés.'] },
    absorption: { assessment: 'Une mission ouverte, des co-responsables et un appui national sont documentés ; la capacité à accueillir une contribution numérique reste à confirmer.', factIndexes: [0, 2], unknowns: ['La mission est-elle encore ouverte au moment du contact ?', 'Qui peut valider une modification du parcours local ou national ?'] },
    firstDeliverable: 'Dessiner le parcours public de candidature et de mise en relation sur une page, avec une proposition de suivi sans données d’enfants.',
    rationale: 'La mission et les étapes du mentorat sont publiques ; la nécessité d’un nouvel outil n’est pas connue.',
    toVerify: ['La mission de co-responsable est-elle toujours ouverte ?', 'Où se perdent, s’il y en a, les candidatures ou demandes de familles ?', 'Quelles données peuvent être utilisées pour un essai sans exposer des mineurs ?'],
    reservations: ['Ne pas copier de données personnelles de familles ou d’enfants dans l’outil.', 'Une mission publiée ne prouve pas un manque de ressources numériques.'], confidence: 'medium',
  },
  {
    name: 'Emmaüs Connect Lyon', url: 'https://emmaus-connect.org/lyon/', location: 'Lyon 8e', locationSource: 0,
    activity: 'Inclusion numérique et accompagnement des publics', theme: 'éducation et jeunesse',
    summary: 'L’antenne lyonnaise d’Emmaüs Connect combine accueil, équipement et accompagnement numérique. Elle présente une équipe locale salariée et bénévole importante : le pilote doit éviter de lui proposer des bases numériques qu’elle maîtrise déjà.',
    sources: [{ url: 'https://emmaus-connect.org/lyon/', label: 'Emmaüs Connect — antenne Lyon' }],
    facts: [
      { source: 0, text: 'L’antenne lyonnaise agit pour l’inclusion numérique et accompagne des personnes en difficulté avec le numérique.', quote: 'promouvoir l’inclusion sociale et numérique en Auvergne-Rhône-Alpes' },
      { source: 0, text: 'La page indique une équipe de salariés et plus de 200 bénévoles à Lyon.', quote: 'plus de 200 bénévoles à Lyon' },
      { source: 0, text: 'Une responsable territoriale Lyon est identifiée sur la page.', quote: 'Responsable territoriale Lyon' },
      { source: 0, text: 'L’antenne propose des engagements bénévoles en accompagnement, reconditionnement, communication et partenariats.', quote: 'Accompagnements, reconditionnement, communication, partenariats' },
      { source: 0, text: 'La page situe l’accueil au 1 rue de l’Égalité, 69008 Lyon.', quote: '1 rue de l’Egalité, 69008 Lyon' },
    ],
    debt: { assessment: 'Aucune dette numérique de base n’est démontrée ; l’inclusion numérique constitue le cœur de son activité. Une contribution pourrait viser la mesure d’un flux opérationnel précis, après expression d’un besoin.', factIndexes: [0, 3], unknowns: ['Outils de suivi des accompagnements, de l’équipement et des bénévoles.', 'Indicateurs utiles qui manqueraient réellement à l’équipe.'] },
    absorption: { assessment: 'L’équipe locale, des responsabilités identifiées et une offre de bénévolat diversifiée rendent plausible l’accueil d’une mission ciblée.', factIndexes: [1, 2, 3], unknowns: ['Disponibilité d’un référent métier et technique.', 'Périmètre autorisé pour un test sur des données agrégées.'] },
    firstDeliverable: 'Maquetter un suivi agrégé d’un seul service local, avec définition des indicateurs et procédure de mise à jour.',
    rationale: 'L’antenne a plusieurs activités et une équipe constituée ; le choix du flux et des indicateurs revient à l’équipe.',
    toVerify: ['Quel service local aurait un indicateur manquant ou difficile à produire ?', 'Existe-t-il une donnée agrégée utilisable sans exposer les bénéficiaires ?'],
    reservations: ['Ne pas présumer d’un besoin d’initiation au numérique dans une association spécialisée sur ce sujet.', 'Aucune donnée individuelle de bénéficiaire ne doit entrer dans la maquette.'], confidence: 'medium',
  },
];

export function buildPilotDossier(pilot: Pilot, consultedAt: string): Dossier {
  const sources = pilot.sources.map((source, index) => ({ id: randomUUID(), ...source, origin: 'public_page' as const, consultedAt, accessStatus: 'available' as const, excerpt: pilot.facts.find(fact => fact.source === index)?.quote }));
  const claims = pilot.facts.map(fact => ({ id: randomUUID(), text: fact.text, kind: 'fact' as const, sourceIds: [sources[fact.source].id], verification: 'sourced' as const, evidence: [{ sourceId: sources[fact.source].id, quote: fact.quote }] }));
  const ids = (indexes: number[]) => indexes.map(index => claims[index].id);
  const sourceIds = (indexes: number[]) => [...new Set(indexes.map(index => sources[pilot.facts[index].source].id))];
  return dossierSchema.parse({
    schemaVersion: 1, preparation: 'manual', associationName: pilot.name,
    summary: pilot.summary, summarySourceIds: sources.map(source => source.id),
    identity: { location: pilot.location, website: pilot.url, activity: pilot.activity, sourceIds: { location: [sources[pilot.locationSource].id], website: [sources[0].id], activity: [sources[0].id] } },
    sources, claims, contacts: [],
    signals: [{ claimId: claims[pilot.debt.factIndexes[0]].id, interpretation: pilot.debt.assessment, confidence: 'medium' }],
    qualification: {
      digitalDebt: { assessment: pilot.debt.assessment, claimIds: ids(pilot.debt.factIndexes), unknowns: pilot.debt.unknowns },
      absorption: { assessment: pilot.absorption.assessment, claimIds: ids(pilot.absorption.factIndexes), unknowns: pilot.absorption.unknowns },
    },
    matches: [
      { criterion: 'Lyon et Métropole', status: 'match', explanation: pilot.location, claimIds: ids([pilot.facts.length - 1]) },
      { criterion: pilot.theme, status: 'match', explanation: pilot.activity, claimIds: ids([0]) },
      { criterion: 'Besoin numérique établi', status: 'unknown', explanation: 'Les sources publiques ne documentent pas les outils internes ni un besoin formulé par l’association.', claimIds: [] },
    ],
    approach: { angle: pilot.firstDeliverable, rationale: pilot.rationale, sourceIds: sourceIds([...pilot.debt.factIndexes, ...pilot.absorption.factIndexes]), toVerify: pilot.toVerify },
    reservations: pilot.reservations, confidence: pilot.confidence,
    confidenceReason: 'Les activités et les indices d’organisation sont sourcés sur des pages publiques consultées le 29 septembre 2026. Le besoin interne et la disponibilité de l’équipe restent inconnus.',
  });
}

const checked = pilots.map(pilot => buildPilotDossier(pilot, new Date().toISOString()));
if (process.argv.includes('--check')) {
  console.log(`${checked.length} dossiers pilotes conformes au schéma.`);
} else {
  const db = await getDb();
  const profile = await getLatestProfile(db);
  if (profile?.version !== 4) throw new Error('Le pilote exige le ciblage version 4 comme version courante.');
  const inputs: TestInput[] = pilots.map(pilot => ({ type: 'url', name: pilot.name, url: pilot.url }));
  const duplicates = await findDuplicates(db, inputs);
  if (duplicates.length) throw new Error(`Des fiches existent déjà : ${duplicates.map(item => item.label).join(', ')}`);
  const runs = await createRuns(db, inputs);
  for (const [index, run] of runs.entries()) await saveDossier(db, run.id, checked[index]);
  const saved = runs.map(run => ({ id: run.id, name: run.label, profileVersion: run.profileVersion }));
  console.log(JSON.stringify(saved, null, 2));
}
