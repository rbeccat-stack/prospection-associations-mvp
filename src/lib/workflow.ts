import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dossierSchema, outreachDraftSchema, type Dossier } from './schemas';
import { getDossier, getRun, saveDossier } from './store';
import { collectedPageSchema, type CollectedPage } from './collector';
import { HttpError } from './http';

export function collection(db: Database.Database, runId: string): CollectedPage[] {
  const row = db.prepare('SELECT payload FROM collections WHERE run_id = ?').get(runId) as { payload: string } | undefined;
  return row ? z.array(collectedPageSchema).parse(JSON.parse(row.payload)) : [];
}
export function saveCollection(db: Database.Database, runId: string, pages: CollectedPage[]) {
  db.prepare('INSERT INTO collections VALUES (?, ?, ?) ON CONFLICT(run_id) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at').run(runId, JSON.stringify(pages), new Date().toISOString());
}
export type Workflow = { state: string; error: string | null; updated_at: string };
export function workflow(db: Database.Database, runId: string): Workflow | null {
  const row = db.prepare('SELECT state,error,updated_at FROM workflows WHERE run_id=?').get(runId) as Workflow | undefined;
  if (row && ['collecting', 'analyzing'].includes(row.state) && Date.now() - Date.parse(row.updated_at) > 300000) return { ...row, state: 'failed', error: 'Traitement interrompu. Vous pouvez le relancer.' };
  return row || null;
}
export function startWork(db: Database.Database, runId: string, state: 'collecting' | 'analyzing') {
  db.transaction(() => {
    if (!getRun(db, runId)) throw new HttpError(404, 'Test introuvable.');
    const active = workflow(db, runId);
    if (active && ['collecting', 'analyzing'].includes(active.state)) throw new HttpError(409, 'Un traitement est déjà en cours.');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO workflows VALUES (?, ?, NULL, ?, ?) ON CONFLICT(run_id) DO UPDATE SET state=excluded.state,error=NULL,started_at=excluded.started_at,updated_at=excluded.updated_at').run(runId, state, now, now);
  }).immediate();
}
export function finishWork(db: Database.Database, runId: string, state: string, error: string | null = null) {
  db.prepare('UPDATE workflows SET state=?,error=?,updated_at=? WHERE run_id=?').run(state, error, new Date().toISOString(), runId);
}
export function revisions(db: Database.Database, runId: string) {
  return (db.prepare('SELECT r.revision,r.payload,r.created_at FROM dossier_revisions r JOIN dossiers d ON d.id=r.dossier_id WHERE d.run_id=? ORDER BY r.revision DESC').all(runId) as { revision: number; payload: string; created_at: string }[]).map(row => ({ revision: row.revision, createdAt: row.created_at, content: dossierSchema.parse(JSON.parse(row.payload)) }));
}
export function replaceDossier(db: Database.Database, runId: string, raw: Dossier, expectedRevision: number) {
  const content = dossierSchema.parse(raw);
  return db.transaction(() => {
    const old = getDossier(db, runId);
    if (!old) {
      if (expectedRevision !== 0) throw new HttpError(409, 'La fiche a changé. Rechargez la page.');
      return saveDossier(db, runId, content);
    }
    if (old.revision !== expectedRevision) throw new HttpError(409, 'La fiche a changé dans une autre fenêtre. Rechargez avant de modifier.');
    db.prepare('INSERT INTO dossier_revisions VALUES (?, ?, ?, ?, ?)').run(randomUUID(), old.id, old.revision, JSON.stringify(old.content), new Date().toISOString());
    db.prepare('UPDATE dossiers SET payload=?,revision=revision+1 WHERE id=?').run(JSON.stringify(content), old.id);
    db.prepare('DELETE FROM claims WHERE dossier_id=?').run(old.id);
    db.prepare('DELETE FROM outreach_drafts WHERE dossier_id=?').run(old.id);
    db.prepare('DELETE FROM source_records WHERE run_id=?').run(runId);
    for (const claim of content.claims) db.prepare('INSERT INTO claims VALUES (?, ?, ?)').run(claim.id, old.id, JSON.stringify(claim));
    for (const source of content.sources) db.prepare('INSERT INTO source_records VALUES (?, ?, ?, ?)').run(source.id, runId, JSON.stringify(source), new Date().toISOString());
    if (content.draft) db.prepare('INSERT INTO outreach_drafts VALUES (?, ?, ?, ?)').run(randomUUID(), old.id, JSON.stringify(content.draft), new Date().toISOString());
    return getDossier(db, runId)!;
  }).immediate();
}
export function editDraft(db: Database.Database, runId: string, raw: unknown, revision: number) {
  const dossier = getDossier(db, runId);
  if (!dossier) throw new HttpError(404, 'Dossier introuvable.');
  const draft = outreachDraftSchema.parse(raw);
  return replaceDossier(db, runId, { ...dossier.content, draft }, revision);
}
