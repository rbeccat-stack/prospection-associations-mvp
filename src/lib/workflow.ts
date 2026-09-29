import type { Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dossierSchema, outreachDraftSchema, type Dossier } from './schemas';
import { atomic, getDossier, getRun, insertDossier, row, rows, run, type Db } from './store';
import { collectedPageSchema, type CollectedPage } from './collector';
import { HttpError } from './http';

export async function collection(db: Db, runId: string): Promise<CollectedPage[]> {
  const value = await row<{ payload: string }>(db, 'SELECT payload FROM collections WHERE run_id = ?', [runId]);
  return value ? z.array(collectedPageSchema).parse(JSON.parse(value.payload)) : [];
}
export async function saveCollection(db: Db, runId: string, pages: CollectedPage[]) {
  await run(db, 'INSERT INTO collections VALUES (?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at', [runId, JSON.stringify(pages), new Date().toISOString()]);
}
export type Workflow = { state: string; error: string | null; updated_at: string };
export async function workflow(db: Db, runId: string): Promise<Workflow | null> {
  const value = await row<Workflow>(db, 'SELECT state,error,updated_at FROM workflows WHERE run_id=?', [runId]);
  if (value && ['collecting', 'analyzing'].includes(value.state) && Date.now() - Date.parse(value.updated_at) > 300000) return { ...value, state: 'failed', error: 'Traitement interrompu. Vous pouvez le relancer.' };
  return value;
}
export async function startWork(db: Client, runId: string, state: 'collecting' | 'analyzing') {
  await atomic(db, async tx => {
    if (!await getRun(tx, runId)) throw new HttpError(404, 'Test introuvable.');
    const active = await workflow(tx, runId);
    if (active && ['collecting', 'analyzing'].includes(active.state)) throw new HttpError(409, 'Un traitement est déjà en cours.');
    const now = new Date().toISOString();
    await run(tx, 'INSERT INTO workflows VALUES (?, ?, NULL, ?, ?) ON CONFLICT(run_id) DO UPDATE SET state=excluded.state,error=NULL,started_at=excluded.started_at,updated_at=excluded.updated_at', [runId, state, now, now]);
  });
}
export async function finishWork(db: Db, runId: string, state: string, error: string | null = null) {
  await run(db, 'UPDATE workflows SET state=?,error=?,updated_at=? WHERE run_id=?', [state, error, new Date().toISOString(), runId]);
}
export async function revisions(db: Db, runId: string) {
  return (await rows<{ revision: number; payload: string; created_at: string }>(db, 'SELECT r.revision,r.payload,r.created_at FROM dossier_revisions r JOIN dossiers d ON d.id=r.dossier_id WHERE d.run_id=? ORDER BY r.revision DESC', [runId])).map(value => ({ revision: value.revision, createdAt: value.created_at, content: dossierSchema.parse(JSON.parse(value.payload)) }));
}
export async function replaceDossier(db: Client, runId: string, raw: Dossier, expectedRevision: number) {
  const content = dossierSchema.parse(raw);
  return atomic(db, async tx => {
    const old = await getDossier(tx, runId);
    if (!old) {
      if (expectedRevision !== 0) throw new HttpError(409, 'La fiche a changé. Rechargez la page.');
      return insertDossier(tx, runId, content);
    }
    if (old.revision !== expectedRevision) throw new HttpError(409, 'La fiche a changé dans une autre fenêtre. Rechargez avant de modifier.');
    await run(tx, 'INSERT INTO dossier_revisions VALUES (?, ?, ?, ?, ?)', [randomUUID(), old.id, old.revision, JSON.stringify(old.content), new Date().toISOString()]);
    await run(tx, 'UPDATE dossiers SET payload=?,revision=revision+1 WHERE id=?', [JSON.stringify(content), old.id]);
    await run(tx, 'DELETE FROM claims WHERE dossier_id=?', [old.id]);
    await run(tx, 'DELETE FROM outreach_drafts WHERE dossier_id=?', [old.id]);
    await run(tx, 'DELETE FROM source_records WHERE run_id=?', [runId]);
    for (const claim of content.claims) await run(tx, 'INSERT INTO claims VALUES (?, ?, ?)', [claim.id, old.id, JSON.stringify(claim)]);
    for (const source of content.sources) await run(tx, 'INSERT INTO source_records VALUES (?, ?, ?, ?)', [source.id, runId, JSON.stringify(source), new Date().toISOString()]);
    if (content.draft) await run(tx, 'INSERT INTO outreach_drafts VALUES (?, ?, ?, ?)', [randomUUID(), old.id, JSON.stringify(content.draft), new Date().toISOString()]);
    return (await getDossier(tx, runId))!;
  });
}
export async function editDraft(db: Client, runId: string, raw: unknown, revision: number) {
  const dossier = await getDossier(db, runId);
  if (!dossier) throw new HttpError(404, 'Dossier introuvable.');
  const draft = outreachDraftSchema.parse(raw);
  return replaceDossier(db, runId, { ...dossier.content, draft }, revision);
}
