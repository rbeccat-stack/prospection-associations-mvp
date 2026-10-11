import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { z } from 'zod';
import { defaultProfile, dossierSchema } from '../src/lib/schemas';
import { createRuns, getDossier, getRun, initializeDb, row, run as sqlRun, saveDossier, saveProfile } from '../src/lib/store';
import { editDraft, revisions, startWork, finishWork, workflow, replaceDossier } from '../src/lib/workflow';
import { collectPage, extractPage, isPublicAddress, publicTarget } from '../src/lib/collector';
import { analyze, validateAnalysis } from '../src/lib/analysis';
import { confirmReceipt, deliveries, previewDelivery, reserveDelivery, sendDelivery } from '../src/lib/delivery';
import { readLocalJson } from '../src/lib/http';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';

async function fixture() {
  const db = createClient({ url: 'file::memory:' }); await initializeDb(db); await saveProfile(db, defaultProfile);
  const [run] = await createRuns(db, [{ type: 'url', name: 'Anciela', url: 'https://www.anciela.info/' }]);
  const content = dossierSchema.parse(JSON.parse(readFileSync(new URL('../examples/anciela-dossier.json', import.meta.url), 'utf8')));
  await saveDossier(db, run.id, content);
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

test('analyse : JSON schema exportable et preuves/contacts inventés rejetés', async () => {
  const { db, content } = await fixture();
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

test('qualification à deux axes : anciens dossiers lisibles et références factuelles exigées', async () => {
  const { db, content } = await fixture();
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

test('analyse : identifiants IA mal formés remplacés sans perdre les preuves ou les liens', async () => {
  const { db, run, content } = await fixture();
  try {
    const pages = content.sources.map(source => ({ source, text: content.claims.filter(claim => claim.sourceIds.includes(source.id)).map(claim => claim.text).join('\n') + '\n' + content.contacts.filter(contact => contact.sourceIds.includes(source.id)).map(contact => contact.value).join('\n') }));
    for (const claim of content.claims) claim.evidence = [{ sourceId: claim.sourceIds[0], quote: claim.text }];
    const modelId = 'observation-8-uuid-mal-forme';
    const raw = structuredClone(content);
    raw.claims[0].id = modelId;
    raw.signals = [{ claimId: modelId, interpretation: 'Interprétation à confirmer.', confidence: 'low' }];
    raw.qualification = {
      digitalDebt: { assessment: 'À vérifier.', claimIds: [modelId], unknowns: [] },
      absorption: { assessment: 'À vérifier.', claimIds: [modelId], unknowns: [] },
    };
    raw.matches = [{ criterion: 'Activité locale', status: 'match', explanation: 'Activité décrite par la source.', claimIds: [modelId] }];
    raw.opportunities = [{ title: 'Premier échange', observation: raw.claims[0].text, service: 'Examiner les processus.', firstDeliverable: 'Cartographie à confirmer.', factClaimIds: [modelId], toVerify: 'Organisation interne.', priority: 'recommended' }];
    const result = validateAnalysis(raw, pages);
    const id = result.claims[0].id;
    assert.ok(z.uuid().safeParse(id).success);
    assert.notEqual(id, modelId);
    assert.equal(result.signals[0].claimId, id);
    assert.deepEqual(result.qualification!.digitalDebt.claimIds, [id]);
    assert.deepEqual(result.qualification!.absorption.claimIds, [id]);
    assert.deepEqual(result.matches[0].claimIds, [id]);
    assert.deepEqual(result.opportunities![0].factClaimIds, [id]);
    assert.deepEqual(result.claims[0].evidence, raw.claims[0].evidence);
    assert.deepEqual(result.sources, pages.map(page => page.source));
    assert.equal(raw.claims[0].id, modelId);
    await replaceDossier(db, run.id, result, 1);
    assert.deepEqual((await getDossier(db, run.id))!.content, result);

    const duplicate = structuredClone(raw); duplicate.claims[1].id = modelId;
    assert.throws(() => validateAnalysis(duplicate, pages), /même référence/);
    const dangling = structuredClone(raw); dangling.opportunities![0].factClaimIds = ['inexistante'];
    assert.throws(() => validateAnalysis(dangling, pages), /observation inexistante/);
    const inventedSource = structuredClone(raw); inventedSource.claims[0].sourceIds = [randomUUID()];
    assert.throws(() => validateAnalysis(inventedSource, pages), /Source inconnue/);
  } finally { db.close(); }
});

test('corrections : ancienne version conservée, conflit refusé et tables cohérentes', async () => {
  const { db, run, content } = await fixture();
  const updated = await editDraft(db, run.id, { ...content.draft, subject: 'Objet corrigé' }, 1);
  assert.equal(updated.revision, 2); assert.equal(updated.content.draft?.subject, 'Objet corrigé');
  assert.equal((await revisions(db, run.id))[0].content.draft?.subject, content.draft?.subject);
  await assert.rejects(editDraft(db, run.id, content.draft, 1), /autre fenêtre/);
  const saved = await row<{ payload: string }>(db, 'SELECT payload FROM outreach_drafts WHERE dossier_id=?', [updated.id]);
  assert.equal(JSON.parse(saved!.payload).subject, updated.content.draft?.subject);
  assert.equal((await getRun(db, run.id))?.profileVersion, 1); db.close();
});

test('adaptateur IA : sortie validée et limite quotidienne appliquée avant un second appel', async () => {
  const { db, run, content } = await fixture();
  const vars = { AI_AUTHORIZED: 'true', AI_BASE_URL: 'https://provider.example/v1', AI_API_KEY: 'test-key', AI_MODEL: 'test-model', AI_DAILY_REQUEST_LIMIT: '1' };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]])); Object.assign(process.env, vars);
  const oldFetch = globalThis.fetch; let calls = 0;
  const pages = content.sources.map(source => ({ source, text: content.claims.filter(c => c.sourceIds.includes(source.id)).map(c => c.text).join('\n') + '\n' + content.contacts.filter(c => c.sourceIds.includes(source.id)).map(c => c.value).join('\n') }));
  for (const claim of content.claims) claim.evidence = [{ sourceId: claim.sourceIds[0], quote: claim.text }];
  globalThis.fetch = async (url, options) => { calls++; assert.equal(String(url), 'https://provider.example/v1/chat/completions'); assert.ok(String(options?.body).includes('test-model')); return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }] }); };
  try { assert.equal((await analyze(db, run, pages)).preparation, 'ai_assisted'); await assert.rejects(analyze(db, run, pages), /Limite quotidienne/); assert.equal(calls, 1); }
  finally { globalThis.fetch = oldFetch; for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } db.close(); }
});

test('OpenRouter : schéma structuré demandé et réponse tronquée signalée clairement', async () => {
  const { db, run, content } = await fixture();
  const vars = { AI_AUTHORIZED: 'true', AI_BASE_URL: 'https://openrouter.ai/api/v1', AI_API_KEY: 'test-key', AI_MODEL: 'deepseek/deepseek-v4.1-flash', AI_DAILY_REQUEST_LIMIT: '5' };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]])); Object.assign(process.env, vars);
  const oldFetch = globalThis.fetch;
  const pages = content.sources.map(source => ({ source, text: content.claims.filter(c => c.sourceIds.includes(source.id)).map(c => c.text).join('\n') }));
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(String(options?.body));
    assert.equal(request.response_format.type, 'json_schema');
    assert.equal(request.response_format.json_schema.name, 'association_dossier');
    assert.ok(request.response_format.json_schema.schema.properties.claims);
    const output = request.response_format.json_schema.schema.properties;
    assert.equal(output.claims.items.properties.id.format, undefined);
    assert.equal(output.signals.items.properties.claimId.format, undefined);
    assert.equal(output.qualification.properties.digitalDebt.properties.claimIds.items.format, undefined);
    assert.equal(output.matches.items.properties.claimIds.items.format, undefined);
    assert.equal(output.opportunities.items.properties.factClaimIds.items.format, undefined);
    assert.equal(output.sources.items.properties.id.format, 'uuid');
    assert.equal(request.provider.require_parameters, true);
    assert.equal(request.max_tokens, 6000);
    assert.deepEqual(request.reasoning, { enabled: false });
    return Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"schemaVersion":1' } }] });
  };
  try { await assert.rejects(analyze(db, run, pages), /limite de longueur/); }
  finally { globalThis.fetch = oldFetch; for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } db.close(); }
});

test('travail : double lancement refusé et traitement interrompu reprenable', async () => {
  const { db, run } = await fixture(); await startWork(db, run.id, 'collecting');
  await assert.rejects(startWork(db, run.id, 'analyzing'), /déjà en cours/);
  await sqlRun(db, 'UPDATE workflows SET updated_at=? WHERE run_id=?', ['2000-01-01T00:00:00.000Z', run.id]);
  assert.equal((await workflow(db, run.id))?.state, 'failed'); await startWork(db, run.id, 'collecting'); await finishWork(db, run.id, 'collected');
  assert.equal((await workflow(db, run.id))?.state, 'collected'); db.close();
});

test('prévisualisation : changement de destinataire ou de version bloque l’envoi', async () => {
  const { db, run, content } = await fixture(); const prior = process.env.TEST_EMAIL_TO; process.env.TEST_EMAIL_TO = 'personnel@example.com';
  try {
    const preview = await previewDelivery(db, run.id);
    assert.ok(preview.body.includes(content.summary)); assert.ok(preview.body.includes(content.sources[0].url!)); assert.ok(preview.body.includes(content.draft!.body));
    await assert.rejects(reserveDelivery(db, run.id, preview.id, 'prospect@example.com', false), /destinataire/);
    await editDraft(db, run.id, { ...content.draft, body: 'Version différente du brouillon.' }, 1);
    await assert.rejects(reserveDelivery(db, run.id, preview.id, 'personnel@example.com', false), /dossier a changé/);
  } finally { if (prior === undefined) delete process.env.TEST_EMAIL_TO; else process.env.TEST_EMAIL_TO = prior; db.close(); }
});

test('livraison : destinataire fixe, même contenu, double clic et reprise maîtrisés', async () => {
  const { db, run } = await fixture();
  const vars = { EMAIL_AUTHORIZED: 'true', TEST_EMAIL_TO: 'personnel@example.com', TEST_EMAIL_FROM: 'expediteur@example.com', SMTP_HOST: 'smtp.example.com', SMTP_USER: 'test', SMTP_PASSWORD: 'test' };
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]])); Object.assign(process.env, vars);
  try {
    const preview = await previewDelivery(db, run.id); let calls = 0;
    const sender = async (config: { recipient: string }, message: { body: string }) => { calls++; assert.equal(config.recipient, vars.TEST_EMAIL_TO); assert.equal(message.body, preview.body); return { accepted: [config.recipient], messageId: 'test-id' }; };
    await sendDelivery(db, run.id, preview.id, false, sender);
    await assert.rejects(sendDelivery(db, run.id, preview.id, false, sender), /déjà une tentative/);
    assert.equal(calls, 1); assert.equal((await deliveries(db, run.id))[0].state, 'accepted');
    await confirmReceipt(db, run.id, (await deliveries(db, run.id))[0].id); assert.equal((await deliveries(db, run.id))[0].state, 'received');
    await editDraft(db, run.id, { ...(await getDossier(db, run.id))!.content.draft, subject: 'Deuxième version' }, 1);
    const next = await previewDelivery(db, run.id);
    await sendDelivery(db, run.id, next.id, false, async () => { throw new Error('timeout'); });
    assert.equal((await deliveries(db, run.id))[0].state, 'uncertain');
    await assert.rejects(sendDelivery(db, run.id, next.id, false, sender));
    await sendDelivery(db, run.id, next.id, true, async config => ({ accepted: [config.recipient], messageId: 'reprise' }));
    assert.equal((await deliveries(db, run.id))[0].state, 'accepted');
    assert.equal((await row<{ n: number }>(db, 'SELECT COUNT(*) n FROM delivery_attempts'))?.n, 3);
  } finally { for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } db.close(); }
});

test('écritures : origine extérieure et contenus non JSON refusés', async () => {
  await assert.rejects(readLocalJson(new Request('http://127.0.0.1:3000/api/tests', { method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json' }, body: '{}' })), /provenir de cette application/);
  await assert.rejects(readLocalJson(new Request('http://127.0.0.1:3000/api/tests', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })), /JSON/);
});

test('accès Vercel : mot de passe requis et identifiants vérifiés', () => {
  const oldVercel = process.env.VERCEL, oldPassword = process.env.APP_PASSWORD;
  process.env.VERCEL = '1'; process.env.APP_PASSWORD = 'secret-de-test';
  try {
    const request = (authorization?: string) => new NextRequest('https://swipe.example/', { headers: authorization ? { authorization } : {} });
    assert.equal(proxy(request()).status, 401);
    assert.equal(proxy(request(`Basic ${Buffer.from('swipe:incorrect').toString('base64')}`)).status, 401);
    assert.equal(proxy(request(`Basic ${Buffer.from('swipe:secret-de-test').toString('base64')}`)).status, 200);
    delete process.env.APP_PASSWORD;
    assert.equal(proxy(request()).status, 503);
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel;
    if (oldPassword === undefined) delete process.env.APP_PASSWORD; else process.env.APP_PASSWORD = oldPassword;
  }
});
