import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { defaultProfile, dossierSchema } from '../src/lib/schemas';
import { createRuns, getDossier, getRun, initializeDb, saveDossier, saveProfile } from '../src/lib/store';
import { editDraft, revisions, startWork, finishWork, workflow } from '../src/lib/workflow';
import { collectPage, extractPage, isPublicAddress, publicTarget } from '../src/lib/collector';
import { analyze, validateAnalysis } from '../src/lib/analysis';
import { confirmReceipt, deliveries, previewDelivery, reserveDelivery, sendDelivery } from '../src/lib/delivery';
import { readLocalJson } from '../src/lib/http';

function fixture() {
  const db = new Database(':memory:'); initializeDb(db); saveProfile(db, defaultProfile);
  const [run] = createRuns(db, [{ type: 'url', name: 'Anciela', url: 'https://www.anciela.info/' }]);
  const content = dossierSchema.parse(JSON.parse(readFileSync(new URL('../examples/anciela-dossier.json', import.meta.url), 'utf8')));
  saveDossier(db, run.id, content);
  return { db, run, content };
}

test('collecte : adresses internes, IPv6 privées et protocoles non web refusés', async () => {
  for (const ip of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.169.254','0.0.0.0','::1','fc00::1','fe80::1','::ffff:127.0.0.1']) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  await assert.rejects(publicTarget('file:///etc/passwd'));
  await assert.rejects(publicTarget('https://user:pass@example.com'));
  const page = await collectPage('http://127.0.0.1');
  assert.equal(page.source.accessStatus, 'unavailable'); assert.equal(page.text, '');
});

test('collecte : texte exploitable, scripts retirés et e-mail visible conservé', () => {
  const result = extractPage('<html><head><title>Association</title></head><body><script>secretScript()</script><p>Notre association agit localement.</p><a href="mailto:bonjour@example.com">Contact</a></body></html>');
  assert.equal(result.title, 'Association'); assert.ok(result.text.includes('bonjour@example.com')); assert.ok(!result.text.includes('secretScript'));
});

test('analyse : JSON schema exportable et preuves/contacts inventés rejetés', () => {
  const { db, content } = fixture();
  assert.ok(z.toJSONSchema(dossierSchema).properties);
  const pages = content.sources.map(source => ({ source, text: content.claims.filter(c => c.sourceIds.includes(source.id)).map(c => c.text).join('\n') + '\n' + content.contacts.filter(c => c.sourceIds.includes(source.id)).map(c => c.value).join('\n') }));
  for (const claim of content.claims) claim.evidence = [{ sourceId: claim.sourceIds[0], quote: claim.text }];
  assert.equal(validateAnalysis(content, pages).preparation, 'ai_assisted');
  const bad = structuredClone(content); bad.claims[0].evidence[0].quote = 'Une preuve inexistante inventée pour ce test.';
  assert.throws(() => validateAnalysis(bad, pages), /passage cité/);
  const badContact = structuredClone(content); badContact.contacts[0].value = 'invente@example.com';
  assert.throws(() => validateAnalysis(badContact, pages), /contact absent/);
  db.close();
});

test('qualification à deux axes : anciens dossiers lisibles et références factuelles exigées', () => {
  const { db, content } = fixture();
  assert.equal(content.qualification, undefined);
  const fact = content.claims.find(claim => claim.kind === 'fact')!;
  const enriched = { ...content, qualification: {
    digitalDebt: { assessment: 'Signal public limité.', claimIds: [fact.id], unknowns: ['Outils internes'] },
    absorption: { assessment: 'À établir.', claimIds: [], unknowns: ['Référent disponible'] },
  } };
  assert.ok(dossierSchema.parse(enriched).qualification);
  assert.throws(() => dossierSchema.parse({ ...enriched, qualification: { ...enriched.qualification, digitalDebt: { ...enriched.qualification.digitalDebt, claimIds: [randomUUID()] } } }), /qualification exige un fait sourcé/);
  db.close();
});

test('corrections : ancienne version conservée, conflit refusé et tables cohérentes', () => {
  const { db, run, content } = fixture();
  const updated = editDraft(db, run.id, { ...content.draft, subject: 'Objet corrigé' }, 1);
  assert.equal(updated.revision, 2); assert.equal(updated.content.draft?.subject, 'Objet corrigé');
  assert.equal(revisions(db, run.id)[0].content.draft?.subject, content.draft?.subject);
  assert.throws(() => editDraft(db, run.id, content.draft, 1), /autre fenêtre/);
  const row = db.prepare('SELECT payload FROM outreach_drafts WHERE dossier_id=?').get(updated.id) as { payload: string };
  assert.equal(JSON.parse(row.payload).subject, updated.content.draft?.subject);
  assert.equal(getRun(db, run.id)?.profileVersion, 1); db.close();
});

test('adaptateur IA : sortie validée et limite quotidienne appliquée avant un second appel', async () => {
  const { db, run, content } = fixture();
  const vars = { AI_AUTHORIZED: 'true', AI_BASE_URL: 'https://provider.example/v1', AI_API_KEY: 'test-key', AI_MODEL: 'test-model', AI_DAILY_REQUEST_LIMIT: '1' };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]])); Object.assign(process.env, vars);
  const oldFetch = globalThis.fetch; let calls = 0;
  const pages = content.sources.map(source => ({ source, text: content.claims.filter(c => c.sourceIds.includes(source.id)).map(c => c.text).join('\n') + '\n' + content.contacts.filter(c => c.sourceIds.includes(source.id)).map(c => c.value).join('\n') }));
  for (const claim of content.claims) claim.evidence = [{ sourceId: claim.sourceIds[0], quote: claim.text }];
  globalThis.fetch = async (url, options) => { calls++; assert.equal(String(url), 'https://provider.example/v1/chat/completions'); assert.ok(String(options?.body).includes('test-model')); return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] }); };
  try { assert.equal((await analyze(db, run, pages)).preparation, 'ai_assisted'); await assert.rejects(analyze(db, run, pages), /Limite quotidienne/); assert.equal(calls, 1); }
  finally { globalThis.fetch = oldFetch; for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } db.close(); }
});

test('travail : double lancement refusé et traitement interrompu reprenable', () => {
  const { db, run } = fixture(); startWork(db, run.id, 'collecting');
  assert.throws(() => startWork(db, run.id, 'analyzing'), /déjà en cours/);
  db.prepare('UPDATE workflows SET updated_at=? WHERE run_id=?').run('2000-01-01T00:00:00.000Z', run.id);
  assert.equal(workflow(db, run.id)?.state, 'failed'); startWork(db, run.id, 'collecting'); finishWork(db, run.id, 'collected');
  assert.equal(workflow(db, run.id)?.state, 'collected'); db.close();
});

test('prévisualisation : changement de destinataire ou de version bloque l’envoi', () => {
  const { db, run, content } = fixture(); const prior = process.env.TEST_EMAIL_TO; process.env.TEST_EMAIL_TO = 'personnel@example.com';
  try {
    const preview = previewDelivery(db, run.id);
    assert.ok(preview.body.includes(content.summary)); assert.ok(preview.body.includes(content.sources[0].url!)); assert.ok(preview.body.includes(content.draft!.body));
    assert.throws(() => reserveDelivery(db, run.id, preview.id, 'prospect@example.com', false), /destinataire/);
    editDraft(db, run.id, { ...content.draft, body: 'Version différente du brouillon.' }, 1);
    assert.throws(() => reserveDelivery(db, run.id, preview.id, 'personnel@example.com', false), /dossier a changé/);
  } finally { if (prior === undefined) delete process.env.TEST_EMAIL_TO; else process.env.TEST_EMAIL_TO = prior; db.close(); }
});

test('livraison : destinataire fixe, même contenu, double clic et reprise maîtrisés', async () => {
  const { db, run } = fixture();
  const vars = { EMAIL_AUTHORIZED: 'true', TEST_EMAIL_TO: 'personnel@example.com', TEST_EMAIL_FROM: 'expediteur@example.com', SMTP_HOST: 'smtp.example.com', SMTP_USER: 'test', SMTP_PASSWORD: 'test' };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]])); Object.assign(process.env, vars);
  try {
    const preview = previewDelivery(db, run.id); let calls = 0;
    const sender = async (config: { recipient: string }, message: { body: string }) => { calls++; assert.equal(config.recipient, vars.TEST_EMAIL_TO); assert.equal(message.body, preview.body); return { accepted: [config.recipient], messageId: 'test-id' }; };
    await sendDelivery(db, run.id, preview.id, false, sender);
    await assert.rejects(sendDelivery(db, run.id, preview.id, false, sender), /déjà une tentative/);
    assert.equal(calls, 1); assert.equal(deliveries(db, run.id)[0].state, 'accepted');
    confirmReceipt(db, run.id, deliveries(db, run.id)[0].id); assert.equal(deliveries(db, run.id)[0].state, 'received');
    editDraft(db, run.id, { ...getDossier(db, run.id)!.content.draft, subject: 'Deuxième version' }, 1);
    const next = previewDelivery(db, run.id);
    await sendDelivery(db, run.id, next.id, false, async () => { throw new Error('timeout'); });
    assert.equal(deliveries(db, run.id)[0].state, 'uncertain');
    await assert.rejects(sendDelivery(db, run.id, next.id, false, sender));
    await sendDelivery(db, run.id, next.id, true, async config => ({ accepted: [config.recipient], messageId: 'reprise' }));
    assert.equal(deliveries(db, run.id)[0].state, 'accepted');
    assert.equal((db.prepare('SELECT COUNT(*) n FROM delivery_attempts').get() as { n: number }).n, 3);
  } finally { for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } db.close(); }
});

test('écritures locales : origine extérieure et contenus non JSON refusés', async () => {
  await assert.rejects(readLocalJson(new Request('http://127.0.0.1:3000/api/tests', { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, body: '{}' })), /réservée/);
  await assert.rejects(readLocalJson(new Request('http://127.0.0.1:3000/api/tests', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })), /JSON/);
});
