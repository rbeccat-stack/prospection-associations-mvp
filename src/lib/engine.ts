import { randomInt, randomUUID } from 'node:crypto';
import type { Client } from '@libsql/client';
import { DEFAULT_ASSOCIATION_OFFER, duplicateKey, type Dossier, type TargetingProfile, type TestInput } from './schemas';
import { createRuns, ensureProfile, getDossier, getRun, row, rows, run, type Db } from './store';
import { collectSite, type CollectedPage } from './collector';
import { analyze as analyzeWithAi } from './analysis';
import { domainRecords, eligibleDomains, joafeNoticeUrl, joafeText, shuffle, type JoafeDomain, type JoafeRecord } from './joafe';
import { collection, finishWork, replaceDossier, saveCollection, startWork } from './workflow';
import { HttpError } from './http';

export const EDITION_MAX_ANALYSES = 5;
export const EDITION_SHORTLIST = 12;
const LOCK_MS = 150_000;
const DOMAIN_ATTEMPTS = 4;

// Built-in targeting from docs/refonte-mobile/CADRAGE.md: it replaces the entry form.
export const INTEGRATED_PROFILE: TargetingProfile = {
  name: 'Ciblage intégré — Lyon, tous secteurs',
  regions: ['Lyon (neuf arrondissements)'],
  associationTypes: ['Association avec une activité identifiable et une implantation lyonnaise étayée'],
  themes: [],
  sizePreference: '',
  digitalMaturity: 'À évaluer ; une structure équipée peut avoir une piste d’exploitation des données ou de mesure d’impact',
  needsSignals: ['Besoin numérique observable', 'Capacité à accueillir une mission', 'Première intervention limitée et maintenable'],
  exclusions: [],
  tone: 'Simple, concret et respectueux',
  offer: DEFAULT_ASSOCIATION_OFFER,
};

export type CandidateState = 'pending' | 'collected' | 'ready' | 'research' | 'skipped' | 'failed' | 'unused';
export type EditionState = 'running' | 'paused' | 'complete';
export type EditionCandidate = { id: string; position: number; rna: string; name: string; website: string; state: CandidateState; reason: string | null; runId: string | null };
export type EditionView = {
  id: string; domainCode: string; domainLabel: string; domainFamily: string; state: EditionState; error: string | null;
  maxAnalyses: number; analysesUsed: number; cost: number | null; createdAt: string; updatedAt: string; candidates: EditionCandidate[];
};
export type EngineDeps = {
  fetcher?: typeof fetch;
  random?: (max: number) => number;
  collect?: (website: string) => Promise<CollectedPage[]>;
  analyze?: typeof analyzeWithAi;
};

type EditionRow = { id: string; domain_code: string; domain_label: string; domain_family: string; profile_version: number; max_analyses: number; state: EditionState; error: string | null; created_at: string; updated_at: string };
type CandidateRow = { id: string; position: number; rna: string; name: string; website: string; record: string; state: CandidateState; reason: string | null; run_id: string | null };

export async function editionView(db: Db, id: string): Promise<EditionView | null> {
  const edition = await row<EditionRow>(db, 'SELECT * FROM editions WHERE id = ?', [id]);
  if (!edition) return null;
  const candidates = await rows<CandidateRow>(db, 'SELECT * FROM edition_candidates WHERE edition_id = ? ORDER BY position', [id]);
  const runIds = candidates.flatMap(candidate => candidate.run_id ? [candidate.run_id] : []);
  const placeholders = runIds.map(() => '?').join(',');
  const used = runIds.length ? (await row<{ n: number }>(db, `SELECT COUNT(*) AS n FROM ai_calls WHERE run_id IN (${placeholders})`, runIds))!.n : 0;
  const costs = runIds.length ? (await rows<{ payload: string }>(db, `SELECT payload FROM analysis_diagnostics WHERE run_id IN (${placeholders})`, runIds)).map(value => (JSON.parse(value.payload) as { cost?: unknown }).cost) : [];
  const known = costs.filter((value): value is number => typeof value === 'number');
  return {
    id: edition.id, domainCode: edition.domain_code, domainLabel: edition.domain_label, domainFamily: edition.domain_family, state: edition.state, error: edition.error,
    maxAnalyses: edition.max_analyses, analysesUsed: Number(used), cost: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
    createdAt: edition.created_at, updatedAt: edition.updated_at,
    candidates: candidates.map(candidate => ({ id: candidate.id, position: candidate.position, rna: candidate.rna, name: candidate.name, website: candidate.website, state: candidate.state, reason: candidate.reason, runId: candidate.run_id })),
  };
}

export async function listEditions(db: Db, limit = 5): Promise<EditionView[]> {
  const ids = await rows<{ id: string }>(db, 'SELECT id FROM editions ORDER BY created_at DESC, rowid DESC LIMIT ?', [limit]);
  return (await Promise.all(ids.map(value => editionView(db, value.id)))).filter((value): value is EditionView => !!value);
}

async function availableRecords(db: Db, domain: JoafeDomain, fetcher: typeof fetch): Promise<JoafeRecord[]> {
  const records = await domainRecords(domain.code, fetcher);
  if (!records.length) return [];
  // An association already proposed in any edition, or examined by hand, is never drawn again.
  const keys = records.map(record => duplicateKey({ type: 'url', url: record.website }));
  const seenRna = new Set((await rows<{ rna: string }>(db, `SELECT DISTINCT rna FROM edition_candidates WHERE rna IN (${records.map(() => '?').join(',')})`, records.map(record => record.rna))).map(value => value.rna));
  const seenKeys = new Set((await rows<{ duplicate_key: string }>(db, `SELECT DISTINCT duplicate_key FROM test_runs WHERE duplicate_key IN (${keys.map(() => '?').join(',')})`, keys)).map(value => value.duplicate_key));
  return records.filter((record, index) => !seenRna.has(record.rna) && !seenKeys.has(keys[index]));
}

export async function startEdition(db: Client, deps: EngineDeps = {}): Promise<EditionView> {
  const fetcher = deps.fetcher || fetch, random = deps.random || randomInt;
  const active = await row<{ id: string }>(db, "SELECT id FROM editions WHERE state = 'running' LIMIT 1");
  if (active) throw new HttpError(409, 'Une édition est déjà en cours. Reprenez-la avant d’en lancer une autre.');
  const previous = await row<{ domain_code: string }>(db, 'SELECT domain_code FROM editions ORDER BY created_at DESC, rowid DESC LIMIT 1');
  // Draw a different category each time, among those that still have candidates.
  const domains = shuffle((await eligibleDomains(fetcher)).filter(domain => domain.code !== previous?.domain_code), random);
  let chosen: { domain: JoafeDomain; records: JoafeRecord[] } | null = null;
  for (const domain of domains.slice(0, DOMAIN_ATTEMPTS)) {
    const records = await availableRecords(db, domain, fetcher);
    if (records.length) { chosen = { domain, records }; break; }
  }
  if (!chosen) throw new HttpError(404, 'Aucune catégorie tirée ne contient d’association lyonnaise encore inédite avec un site déclaré. Relancez une édition.');
  const profile = await ensureProfile(db, INTEGRATED_PROFILE);
  const shortlist = shuffle(chosen.records, random).slice(0, EDITION_SHORTLIST);
  const id = randomUUID(), now = new Date().toISOString();
  const statements = [
    { sql: "INSERT INTO editions(id, domain_code, domain_label, domain_family, profile_version, max_analyses, state, error, lock_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'running', NULL, NULL, ?, ?)", args: [id, chosen.domain.code, chosen.domain.label, chosen.domain.family, profile.version, EDITION_MAX_ANALYSES, now, now] },
    ...shortlist.map((record, position) => ({ sql: "INSERT INTO edition_candidates(id, edition_id, position, rna, name, website, record, state, reason, run_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)", args: [randomUUID(), id, position, record.rna, record.title.slice(0, 160), record.website, JSON.stringify(record), now] })),
  ];
  await db.batch(statements, 'write');
  return (await editionView(db, id))!;
}

function noticePage(record: JoafeRecord): CollectedPage {
  return { source: { id: randomUUID(), url: joafeNoticeUrl(record.id), label: `Journal officiel — ${record.title}`.slice(0, 200), origin: 'public_page', consultedAt: new Date().toISOString(), accessStatus: 'available' }, text: joafeText(record) };
}

function runInput(record: JoafeRecord, domainLabel: string): TestInput {
  return {
    type: 'manual', name: record.title.slice(0, 160), url: record.website,
    location: [record.address, `${record.postalCode} ${record.commune}`.trim()].filter(Boolean).join(', ').slice(0, 1200),
    activity: `Catégorie du Journal officiel : ${domainLabel}`.slice(0, 1200),
    summary: (record.objet || 'Objet non repris dans l’annonce consultée.').slice(0, 1200),
    sourceNote: `Préparé par le moteur à partir du Journal officiel des associations (RNA ${record.rna}, annonce du ${record.publishedAt}). Le besoin éventuel reste à établir à partir du site.`.slice(0, 1200),
  };
}

// A card needs a fact read on the association's own site, a signal and a supported intervention.
export function publication(dossier: Dossier, sitePageIds: Set<string>): { state: 'ready' | 'research'; reason: string | null } {
  if (!(dossier.opportunities || []).length) return { state: 'research', reason: 'Aucune intervention appuyée sur un fait vérifié.' };
  if (!dossier.signals.length) return { state: 'research', reason: 'Aucun signal observable relevé.' };
  if (!dossier.claims.some(claim => claim.kind === 'fact' && claim.sourceIds.some(id => sitePageIds.has(id)))) return { state: 'research', reason: 'Aucun fait tiré du site de l’association.' };
  return { state: 'ready', reason: null };
}

async function setCandidate(db: Db, id: string, state: CandidateState, reason: string | null, runId?: string) {
  await run(db, 'UPDATE edition_candidates SET state = ?, reason = ?, run_id = COALESCE(?, run_id), updated_at = ? WHERE id = ?', [state, reason, runId ?? null, new Date().toISOString(), id]);
}
async function setEdition(db: Db, id: string, state: EditionState, error: string | null) {
  await run(db, 'UPDATE editions SET state = ?, error = ?, updated_at = ? WHERE id = ?', [state, error, new Date().toISOString(), id]);
}

async function collectCandidate(db: Client, edition: EditionRow, candidate: CandidateRow, deps: EngineDeps) {
  const record = JSON.parse(candidate.record) as JoafeRecord;
  let runId = candidate.run_id;
  if (!runId) {
    runId = (await createRuns(db, [runInput(record, edition.domain_label)], true, edition.profile_version))[0].id;
    await setCandidate(db, candidate.id, 'pending', null, runId);
  }
  await startWork(db, runId, 'collecting');
  try {
    const site = await (deps.collect || collectSite)(record.website);
    const pages = [noticePage(record), ...site];
    await saveCollection(db, runId, pages);
    if (site.some(page => page.source.accessStatus === 'available')) {
      await finishWork(db, runId, 'collected');
      await setCandidate(db, candidate.id, 'collected', null);
    } else {
      // No paid call without a readable page from the association itself.
      const reason = site.find(page => page.error)?.error || 'Site illisible.';
      await finishWork(db, runId, 'failed', `Site illisible : ${reason}`);
      await setCandidate(db, candidate.id, 'skipped', reason);
    }
  } catch (error) {
    await finishWork(db, runId, 'failed', 'La collecte a échoué.');
    throw error;
  }
}

// Returns false when the edition must pause (daily limit or missing AI configuration).
async function analyzeCandidate(db: Client, edition: EditionRow, candidate: CandidateRow, deps: EngineDeps): Promise<boolean> {
  const runInfo = await getRun(db, candidate.run_id!);
  if (!runInfo) throw new HttpError(404, 'Test introuvable.');
  const pages = await collection(db, runInfo.id);
  const sitePages = new Set(pages.filter(page => !page.source.url?.startsWith('https://www.journal-officiel.gouv.fr/')).map(page => page.source.id));
  // A dossier saved by an interrupted step is classified again, never paid for twice.
  const saved = await getDossier(db, runInfo.id);
  if (saved) {
    const outcome = publication(saved.content, sitePages);
    await setCandidate(db, candidate.id, outcome.state, outcome.reason);
    return true;
  }
  await startWork(db, runInfo.id, 'analyzing', 0);
  try {
    const content = await (deps.analyze || analyzeWithAi)(db, runInfo, pages);
    const dossier = await replaceDossier(db, runInfo.id, content, 0);
    await finishWork(db, runInfo.id, 'ready');
    const outcome = publication(dossier.content, sitePages);
    await setCandidate(db, candidate.id, outcome.state, outcome.reason);
    return true;
  } catch (error) {
    if (error instanceof HttpError && (error.status === 429 || (error.status === 409 && /fournisseur autorisé/.test(error.message)))) {
      await finishWork(db, runInfo.id, 'collected');
      await setEdition(db, edition.id, 'paused', error.message);
      return false;
    }
    const message = error instanceof HttpError ? error.message : 'Analyse impossible. Le dossier n’a pas été enregistré.';
    await finishWork(db, runInfo.id, 'failed', message);
    await setCandidate(db, candidate.id, 'failed', message);
    return true;
  }
}

// One short unit of work per call (one collection or one analysis), so each
// request stays within the function time limit and a step is never run twice.
export async function advanceEdition(db: Client, id: string, deps: EngineDeps = {}): Promise<EditionView> {
  const now = Date.now();
  const lock = await db.execute({ sql: 'UPDATE editions SET lock_until = ? WHERE id = ? AND (lock_until IS NULL OR lock_until < ?)', args: [new Date(now + LOCK_MS).toISOString(), id, new Date(now).toISOString()] });
  if (!lock.rowsAffected) {
    if (!await row(db, 'SELECT 1 FROM editions WHERE id = ?', [id])) throw new HttpError(404, 'Édition introuvable.');
    throw new HttpError(409, 'Une étape de cette édition est déjà en cours.');
  }
  try {
    let edition = (await row<EditionRow>(db, 'SELECT * FROM editions WHERE id = ?', [id]))!;
    if (edition.state === 'paused') { await setEdition(db, id, 'running', null); edition = { ...edition, state: 'running' }; }
    if (edition.state !== 'running') return (await editionView(db, id))!;
    const view = (await editionView(db, id))!;
    const candidates = await rows<CandidateRow>(db, "SELECT * FROM edition_candidates WHERE edition_id = ? AND state IN ('pending', 'collected') ORDER BY position", [id]);
    const next = candidates[0];
    if (!next || view.analysesUsed >= edition.max_analyses) {
      await run(db, "UPDATE edition_candidates SET state = 'unused', updated_at = ? WHERE edition_id = ? AND state IN ('pending', 'collected')", [new Date().toISOString(), id]);
      await setEdition(db, id, 'complete', null);
    } else if (next.state === 'pending') {
      await collectCandidate(db, edition, next, deps);
    } else if (await analyzeCandidate(db, edition, next, deps)) {
      await run(db, 'UPDATE editions SET updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
    }
    return (await editionView(db, id))!;
  } finally {
    await run(db, 'UPDATE editions SET lock_until = NULL WHERE id = ?', [id]);
  }
}

// Ends an edition early; prepared dossiers stay available, untouched candidates are marked unused.
export async function closeEdition(db: Client, id: string): Promise<EditionView> {
  const now = new Date().toISOString();
  const lock = await db.execute({ sql: "UPDATE editions SET state = 'complete', error = NULL, updated_at = ? WHERE id = ? AND state != 'complete' AND (lock_until IS NULL OR lock_until < ?)", args: [now, id, now] });
  if (!lock.rowsAffected) {
    const edition = await row<{ state: string }>(db, 'SELECT state FROM editions WHERE id = ?', [id]);
    if (!edition) throw new HttpError(404, 'Édition introuvable.');
    if (edition.state !== 'complete') throw new HttpError(409, 'Une étape est en cours : réessayez dans un instant.');
  }
  await run(db, "UPDATE edition_candidates SET state = 'unused', updated_at = ? WHERE edition_id = ? AND state IN ('pending', 'collected')", [now, id]);
  return (await editionView(db, id))!;
}
