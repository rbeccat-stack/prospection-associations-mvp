import { createClient, type Client, type Transaction, type InArgs } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalizeUrl, dossierSchema, duplicateKey, inputLabel, targetingProfileSchema, testInputSchema, type Dossier, type TargetingProfile, type TestInput } from "./schemas";

export type Db = Client | Transaction;
export type StoredProfile = { version: number; criteria: TargetingProfile; createdAt: string };
export type StoredRun = { id: string; label: string; inputType: TestInput["type"]; input: TestInput; duplicateKey: string; profileVersion: number; profileSnapshot: TargetingProfile; status: "pending_analysis"; dossierReady: boolean; createdAt: string; workflowState?: string; deliveryState?: string };
export type StoredDossier = { id: string; runId: string; createdAt: string; revision: number; content: Dossier };
export type DuplicateMatch = { index: number; label: string; previousRunId: string | null; previousLabel: string | null };

type ProfileRow = { version: number; payload: string; created_at: string };
type RunRow = { id: string; label: string; input_type: TestInput["type"]; input_payload: string; duplicate_key: string; profile_version: number; profile_snapshot: string; status: "pending_analysis"; dossier_ready: number; created_at: string };
type DossierRow = { id: string; run_id: string; payload: string; created_at: string; revision: number };

export async function rows<T>(db: Db, sql: string, args: InArgs = []): Promise<T[]> {
  return (await db.execute({ sql, args })).rows as unknown as T[];
}
export async function row<T>(db: Db, sql: string, args: InArgs = []): Promise<T | null> {
  return (await rows<T>(db, sql, args))[0] ?? null;
}
export async function run(db: Db, sql: string, args: InArgs = []): Promise<void> {
  await db.execute({ sql, args });
}
export async function atomic<T>(db: Client, action: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await db.transaction("write");
  try {
    const result = await action(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

const schema = [
  `CREATE TABLE IF NOT EXISTS targeting_profiles (version INTEGER PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS test_runs (id TEXT PRIMARY KEY, label TEXT NOT NULL, input_type TEXT NOT NULL, input_payload TEXT NOT NULL, duplicate_key TEXT NOT NULL, profile_version INTEGER NOT NULL REFERENCES targeting_profiles(version), profile_snapshot TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending_analysis')), created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS test_runs_duplicate_key ON test_runs(duplicate_key, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS source_records (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), payload TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS dossiers (id TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE REFERENCES test_runs(id), schema_version INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id), payload TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS outreach_drafts (id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id), payload TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS dossier_revisions (id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id), revision INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(dossier_id, revision))`,
  `CREATE TABLE IF NOT EXISTS collections (run_id TEXT PRIMARY KEY REFERENCES test_runs(id), payload TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS workflows (run_id TEXT PRIMARY KEY REFERENCES test_runs(id), state TEXT NOT NULL, error TEXT, started_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_calls (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), revision INTEGER NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL, provider_id TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(run_id, revision))`,
  `CREATE TABLE IF NOT EXISTS delivery_previews (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), revision INTEGER NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS delivery_attempts (id TEXT PRIMARY KEY, delivery_id TEXT NOT NULL REFERENCES deliveries(id), state TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL)`,
];

export async function initializeDb(db: Client): Promise<void> {
  for (const statement of schema.slice(0, 7)) await run(db, statement);
  const columns = await rows<{ name: string }>(db, "PRAGMA table_info(dossiers)");
  if (!columns.some(column => column.name === "revision")) {
    try { await run(db, "ALTER TABLE dossiers ADD COLUMN revision INTEGER NOT NULL DEFAULT 1"); }
    catch (error) {
      if (!(await rows<{ name: string }>(db, "PRAGMA table_info(dossiers)")).some(column => column.name === "revision")) throw error;
    }
  }
  for (const statement of schema.slice(7)) await run(db, statement);
}

declare global { var __prospectionDb: Promise<Client> | undefined; }
export function getDb(): Promise<Client> {
  if (!globalThis.__prospectionDb) {
    globalThis.__prospectionDb = (async () => {
      const remote = process.env.TURSO_DATABASE_URL;
      if (process.env.VERCEL && !remote) throw new Error("TURSO_DATABASE_URL manque dans les variables Vercel.");
      if (remote && !process.env.TURSO_AUTH_TOKEN) throw new Error("TURSO_AUTH_TOKEN manque pour la base Turso.");
      const filename = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join(process.cwd(), ".data", "prospection.db");
      if (!remote) mkdirSync(path.dirname(filename), { recursive: true });
      const db = createClient({ url: remote || `file:${filename.replace(/\\/g, "/")}`, authToken: process.env.TURSO_AUTH_TOKEN });
      await initializeDb(db);
      return db;
    })().catch(error => { globalThis.__prospectionDb = undefined; throw error; });
  }
  return globalThis.__prospectionDb;
}

function profileFromRow(value: ProfileRow): StoredProfile {
  return { version: value.version, criteria: targetingProfileSchema.parse(JSON.parse(value.payload)), createdAt: value.created_at };
}
function runFromRow(value: RunRow): StoredRun {
  return { id: value.id, label: value.label, inputType: value.input_type, input: testInputSchema.parse(JSON.parse(value.input_payload)), duplicateKey: value.duplicate_key, profileVersion: value.profile_version, profileSnapshot: targetingProfileSchema.parse(JSON.parse(value.profile_snapshot)), status: value.status, dossierReady: !!value.dossier_ready, createdAt: value.created_at };
}
export async function getLatestProfile(db: Db): Promise<StoredProfile | null> {
  const value = await row<ProfileRow>(db, "SELECT version, payload, created_at FROM targeting_profiles ORDER BY version DESC LIMIT 1");
  return value ? profileFromRow(value) : null;
}
export async function saveProfile(db: Client, input: TargetingProfile): Promise<StoredProfile> {
  const criteria = targetingProfileSchema.parse(input);
  return atomic(db, async tx => {
    const current = await row<{ version: number | null }>(tx, "SELECT MAX(version) AS version FROM targeting_profiles");
    const version = (current?.version || 0) + 1;
    const createdAt = new Date().toISOString();
    await run(tx, "INSERT INTO targeting_profiles(version, payload, created_at) VALUES (?, ?, ?)", [version, JSON.stringify(criteria), createdAt]);
    return { version, criteria, createdAt };
  });
}
export async function listRuns(db: Db, limit = 50): Promise<StoredRun[]> {
  return (await rows<RunRow>(db, "SELECT r.*, EXISTS(SELECT 1 FROM dossiers d WHERE d.run_id = r.id) AS dossier_ready FROM test_runs r ORDER BY r.created_at DESC, r.rowid DESC LIMIT ?", [limit])).map(runFromRow);
}
export async function getRun(db: Db, id: string): Promise<StoredRun | null> {
  const value = await row<RunRow>(db, "SELECT r.*, EXISTS(SELECT 1 FROM dossiers d WHERE d.run_id = r.id) AS dossier_ready FROM test_runs r WHERE r.id = ?", [id]);
  return value ? runFromRow(value) : null;
}
export async function findDuplicates(db: Db, inputs: TestInput[]): Promise<DuplicateMatch[]> {
  const seen = new Map<string, string>();
  const matches: DuplicateMatch[] = [];
  for (const [index, rawInput] of inputs.entries()) {
    const input = testInputSchema.parse(rawInput);
    const key = duplicateKey(input);
    const previous = await row<{ id: string; label: string }>(db, "SELECT id, label FROM test_runs WHERE duplicate_key = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", [key]);
    const inBatch = seen.get(key);
    if (previous || inBatch) matches.push({ index, label: inputLabel(input), previousRunId: previous?.id || null, previousLabel: previous?.label || inBatch || null });
    seen.set(key, inputLabel(input));
  }
  return matches;
}
export class DuplicateError extends Error {
  constructor(public matches: DuplicateMatch[]) { super("Une ou plusieurs associations ont déjà été examinées."); }
}
export async function createRuns(db: Client, rawInputs: TestInput[], allowDuplicates = false): Promise<StoredRun[]> {
  if (rawInputs.length < 1 || rawInputs.length > 10) throw new Error("Choisissez de 1 à 10 associations.");
  const inputs = rawInputs.map(input => testInputSchema.parse(input));
  return atomic(db, async tx => {
    const profile = await getLatestProfile(tx);
    if (!profile) throw new Error("Enregistrez d’abord votre ciblage.");
    const duplicates = await findDuplicates(tx, inputs);
    if (duplicates.length && !allowDuplicates) throw new DuplicateError(duplicates);
    const createdAt = new Date().toISOString();
    const result: StoredRun[] = [];
    for (const input of inputs) {
      const id = randomUUID(), label = inputLabel(input), key = duplicateKey(input);
      const normalized = input.url ? { ...input, url: canonicalizeUrl(input.url) } : input;
      await run(tx, "INSERT INTO test_runs(id, label, input_type, input_payload, duplicate_key, profile_version, profile_snapshot, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, label, input.type, JSON.stringify(normalized), key, profile.version, JSON.stringify(profile.criteria), "pending_analysis", createdAt]);
      result.push({ id, label, inputType: input.type, input: normalized, duplicateKey: key, profileVersion: profile.version, profileSnapshot: profile.criteria, status: "pending_analysis", dossierReady: false, createdAt });
    }
    return result;
  });
}
export async function getDossier(db: Db, runId: string): Promise<StoredDossier | null> {
  const value = await row<DossierRow>(db, "SELECT id, run_id, payload, created_at, revision FROM dossiers WHERE run_id = ?", [runId]);
  return value ? { id: value.id, runId: value.run_id, createdAt: value.created_at, revision: value.revision, content: dossierSchema.parse(JSON.parse(value.payload)) } : null;
}
export async function insertDossier(db: Db, runId: string, raw: Dossier): Promise<StoredDossier> {
  const content = dossierSchema.parse(raw);
  if (!await getRun(db, runId)) throw new Error("Test introuvable.");
  if (await getDossier(db, runId)) throw new Error("Ce test possède déjà un dossier.");
  const id = randomUUID(), createdAt = new Date().toISOString();
  await run(db, "INSERT INTO dossiers(id, run_id, schema_version, payload, created_at) VALUES (?, ?, ?, ?, ?)", [id, runId, content.schemaVersion, JSON.stringify(content), createdAt]);
  for (const source of content.sources) await run(db, "INSERT INTO source_records(id, run_id, payload, created_at) VALUES (?, ?, ?, ?)", [source.id, runId, JSON.stringify(source), createdAt]);
  for (const claim of content.claims) await run(db, "INSERT INTO claims(id, dossier_id, payload) VALUES (?, ?, ?)", [claim.id, id, JSON.stringify(claim)]);
  if (content.draft) await run(db, "INSERT INTO outreach_drafts(id, dossier_id, payload, created_at) VALUES (?, ?, ?, ?)", [randomUUID(), id, JSON.stringify(content.draft), createdAt]);
  return { id, runId, createdAt, revision: 1, content };
}
export async function saveDossier(db: Client, runId: string, raw: Dossier): Promise<StoredDossier> {
  return atomic(db, tx => insertDossier(tx, runId, raw));
}
