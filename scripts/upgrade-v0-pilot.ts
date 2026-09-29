import { getDb, getDossier, getLatestProfile, saveProfile } from '../src/lib/store';
import { replaceDossier } from '../src/lib/workflow';

const db = getDb();
const offer = "Je suis spécialiste du numérique. J'aide les associations qui manquent de temps ou de moyens pour leurs sujets numériques. Je peux aussi examiner avec elles si l'IA simplifierait certaines tâches de gestion ou du quotidien.";
const profile = getLatestProfile(db);
if (profile && !profile.criteria.offer) saveProfile(db, { ...profile.criteria, offer });
const id = '42a322ab-4012-4928-95ac-db8ffe51014b';
const dossier = getDossier(db, id);
if (dossier?.content.draft?.body.includes('[Présentez ici votre activité')) {
  const content = structuredClone(dossier.content);
  content.draft!.body = content.draft!.body.replace('[Présentez ici votre activité et la valeur concrète que vous apportez, en une phrase.]', offer);
  content.approach.toVerify = content.approach.toVerify.filter(item => !item.startsWith('Confirmer ce que vous proposez'));
  content.reservations = content.reservations.filter(item => !item.includes('emplacement à adapter à votre offre'));
  replaceDossier(db, id, content, dossier.revision);
}
console.log('Offre enregistrée et brouillon Artis actualisé ; versions précédentes conservées.');
