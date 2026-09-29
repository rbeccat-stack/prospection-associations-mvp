import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import { getDossier, getRun, type StoredDossier } from './store';
import { mailConfig } from './services';
import { HttpError } from './http';

export function deliveryText(dossier: StoredDossier, criteria: unknown) {
  const d = dossier.content;
  const sourceMap = new Map(d.sources.map((s, i) => [s.id, `[${i + 1}]`]));
  const refs = (ids: string[]) => ids.map(id => sourceMap.get(id)).join(' ');
  const claimRefs = (ids: string[]) => refs([...new Set(d.claims.filter(c => ids.includes(c.id)).flatMap(c => c.sourceIds))]);
  return [
    `DOSSIER DE TEST — ${d.associationName} — version ${dossier.revision}`,
    'Le message de prospection ci-dessous est un brouillon non envoyé.',
    `Résumé\n${d.summary} ${refs(d.summarySourceIds)}`,
    `Identité\n${d.identity.location || 'Localisation inconnue'} ${refs(d.identity.sourceIds.location)}\n${d.identity.website || 'Site inconnu'} ${refs(d.identity.sourceIds.website)}\n${d.identity.activity || 'Activité inconnue'} ${refs(d.identity.sourceIds.activity)}`,
    `Contacts\n${d.contacts.map(c => `${c.label} : ${c.value} ${refs(c.sourceIds)}`).join('\n') || 'Aucun contact vérifié.'}`,
    `Affirmations\n${d.claims.map(c => `${c.kind === 'fact' ? 'Fait sourcé' : c.kind === 'unknown' ? 'Inconnu' : 'Hypothèse / interprétation'} : ${c.text} ${refs(c.sourceIds)}`).join('\n')}`,
    d.qualification ? `Qualification sur deux axes\n${(['digitalDebt', 'absorption'] as const).map(axis => `${axis === 'digitalDebt' ? 'Dette numérique' : 'Capacité à accueillir une mission'} : ${d.qualification![axis].assessment} ${claimRefs(d.qualification![axis].claimIds)}\nInconnus : ${d.qualification![axis].unknowns.join(' ; ')}`).join('\n')}` : '',
    `Correspondance aux critères\n${d.matches.map(m => `${m.criterion} — ${m.status === 'match' ? 'Correspond' : m.status === 'no_match' ? 'Ne correspond pas' : 'À vérifier'} : ${m.explanation} ${claimRefs(m.claimIds)}`).join('\n')}`,
    `Signaux et hypothèses\n${d.signals.map(s => `Observation : ${d.claims.find(c => c.id === s.claimId)?.text}\nHypothèse : ${s.interpretation} ${claimRefs([s.claimId])}`).join('\n')}`,
    `Confiance : ${d.confidence === 'high' ? 'élevée' : d.confidence === 'medium' ? 'moyenne' : 'faible'}\n${d.confidenceReason}`,
    `Réserves\n${d.reservations.map(r => `- ${r}`).join('\n')}`,
    `Approche\n${d.approach.angle}\n${d.approach.rationale} ${refs(d.approach.sourceIds)}\nÀ vérifier :\n${d.approach.toVerify.join('\n')}`,
    d.draft ? `BROUILLON NON ENVOYÉ\nObjet : ${d.draft.subject}\n\n${d.draft.body}` : 'Informations insuffisantes pour personnaliser un brouillon.',
    `Sources\n${d.sources.map((s, i) => `[${i + 1}] ${s.label}\n${s.url || 'Entrée utilisateur'}\n${s.consultedAt || 'Date inconnue'} — ${s.accessStatus === 'available' ? 'Consultée' : 'Non consultable'}`).join('\n\n')}`,
    `Ciblage conservé\n${JSON.stringify(criteria, null, 2)}`,
  ].join('\n\n');
}
export type Delivery = { id: string; run_id: string; revision: number; recipient: string; subject: string; body: string; state: string; provider_id: string | null; error: string | null; created_at: string; updated_at: string };
export function deliveries(db: Database.Database, runId: string): Delivery[] {
  return (db.prepare('SELECT * FROM deliveries WHERE run_id=? ORDER BY created_at DESC').all(runId) as Delivery[]).map(row => row.state === 'sending' && Date.now() - Date.parse(row.updated_at) > 120000 ? { ...row, state: 'uncertain', error: 'Envoi interrompu : vérifiez votre boîte avant toute reprise.' } : row);
}
export function previewDelivery(db: Database.Database, runId: string) {
  const dossier = getDossier(db, runId); const run = getRun(db, runId);
  if (!dossier || !run) throw new HttpError(404, 'Dossier introuvable.');
  const id = randomUUID(); const recipient = mailConfig().recipient;
  const subject = `Dossier de test : ${dossier.content.associationName}`;
  const body = deliveryText(dossier, run.profileSnapshot);
  db.prepare('INSERT INTO delivery_previews VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, runId, dossier.revision, recipient, subject, body, new Date().toISOString());
  return { id, revision: dossier.revision, recipient, subject, body };
}
type Preview = { id: string; run_id: string; revision: number; recipient: string; subject: string; body: string; created_at: string };
export function reserveDelivery(db: Database.Database, runId: string, previewId: string, recipient: string, retry: boolean) {
  return db.transaction(() => {
    const preview = db.prepare('SELECT * FROM delivery_previews WHERE id=? AND run_id=?').get(previewId, runId) as Preview | undefined;
    if (!preview || Date.now() - Date.parse(preview.created_at) > 900000) throw new HttpError(409, 'Prévisualisation expirée. Ouvrez-en une nouvelle avant l’envoi.');
    if (preview.recipient !== recipient || !recipient) throw new HttpError(409, 'Le destinataire a changé. Prévisualisez de nouveau.');
    if (getDossier(db, runId)?.revision !== preview.revision) throw new HttpError(409, 'Le dossier a changé. Prévisualisez la nouvelle version.');
    const old = deliveries(db, runId).find(row => row.revision === preview.revision);
    if (old && old.recipient !== recipient) throw new HttpError(409, 'Cette version est liée à un autre destinataire de test. Créez une nouvelle version avant de changer de destinataire.');
    if (old && !(['failed', 'uncertain'].includes(old.state) && retry)) throw new HttpError(409, 'Cette version possède déjà une tentative. Consultez son état avant de reprendre.');
    const now = new Date().toISOString(); const id = old?.id || randomUUID();
    if (old) db.prepare("UPDATE deliveries SET state='sending',error=NULL,updated_at=? WHERE id=?").run(now, id);
    else db.prepare('INSERT INTO deliveries VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)').run(id, runId, preview.revision, recipient, preview.subject, preview.body, 'sending', now, now);
    const attemptId = randomUUID();
    db.prepare('INSERT INTO delivery_attempts VALUES (?, ?, ?, NULL, ?)').run(attemptId, id, 'sending', now);
    return { id, attemptId, preview };
  }).immediate();
}
type MailSender = (config: ReturnType<typeof mailConfig>, message: { id: string; subject: string; body: string }) => Promise<{ accepted: string[]; messageId: string }>;
const smtpSender: MailSender = async (config, message) => {
  const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: true, auth: { user: config.user, pass: config.pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, dnsTimeout: 5000, disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false });
  try {
    const sent = await transport.sendMail({ from: config.from, to: config.recipient, envelope: { from: config.from, to: [config.recipient] }, subject: message.subject, text: message.body, messageId: `<${message.id}@dossier.local>` });
    return { accepted: sent.accepted.map(String), messageId: sent.messageId };
  } finally { transport.close(); }
};
export async function sendDelivery(db: Database.Database, runId: string, previewId: string, retry: boolean, sender: MailSender = smtpSender) {
  const config = mailConfig();
  if (!config.ready) throw new HttpError(409, "L'e-mail de test attend sa configuration et votre adresse personnelle.");
  const reserved = reserveDelivery(db, runId, previewId, config.recipient, retry);
  let state = 'uncertain', error: string | null = null, providerId: string | null = null;
  try {
    const sent = await sender(config, { id: reserved.id, subject: reserved.preview.subject, body: reserved.preview.body });
    if (!sent.accepted.map(String).includes(config.recipient)) { state = 'failed'; error = 'Le serveur e-mail a refusé le destinataire de test.'; }
    else { state = 'accepted'; providerId = sent.messageId; }
  } catch (failure) {
    const code = (failure as { code?: string }).code;
    state = ['EAUTH', 'EENVELOPE', 'ECONNECTION', 'EDNS', 'ETLS'].includes(code || '') ? 'failed' : 'uncertain';
    error = state === 'failed' ? "Envoi refusé ou connexion impossible. Vérifiez la configuration avant de reprendre." : "Résultat d'envoi incertain. Vérifiez votre boîte et les indésirables avant de reprendre.";
  }
  db.transaction(() => {
    db.prepare('UPDATE deliveries SET state=?,provider_id=?,error=?,updated_at=? WHERE id=?').run(state, providerId, error, new Date().toISOString(), reserved.id);
    db.prepare('UPDATE delivery_attempts SET state=?,error=? WHERE id=?').run(state, error, reserved.attemptId);
  }).immediate();
  return deliveries(db, runId);
}
export function confirmReceipt(db: Database.Database, runId: string, deliveryId: string) {
  const delivery = deliveries(db, runId).find(row => row.id === deliveryId);
  if (!delivery || !['accepted', 'uncertain'].includes(delivery.state)) throw new HttpError(409, 'Aucun envoi à confirmer.');
  db.prepare("UPDATE deliveries SET state='received',error=NULL,updated_at=? WHERE id=?").run(new Date().toISOString(), deliveryId);
}
