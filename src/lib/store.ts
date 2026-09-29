import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { canonicalizeUrl, dossierSchema, duplicateKey, inputLabel, targetingProfileSchema, testInputSchema, type Dossier, type TargetingProfile, type TestInput } from "./schemas";

export type StoredProfile = { version: number; criteria: TargetingProfile; createdAt: string };
export type StoredRun = {
  id: string;
  label: string;
  inputType: TestInput["type"];
  input: TestInput;
  duplicateKey: string;
  profileVersion: number;
  profileSnapshot: TargetingProfile;
  status: "pending_analysis";
  dossierReady: boolean;
  createdAt: string;
  workflowState?: string;
  deliveryState?: string;
};
export type StoredDossier = { id: string; runId: string; createdAt: string; revision: number; content: Dossier };
export type DuplicateMatch = { index: number; label: string; previousRunId: string | null; previousLabel: string | null };

type ProfileRow = { version: number; payload: string; created_at: string };
type RunRow = { id: string; label: string; input_type: TestInput["type"]; input_payload: string; duplicate_key: string; profile_version: number; profile_snapshot: string; status: "pending_analysis"; dossier_ready: number; created_at: string };
type DossierRow = { id: string; run_id: string; payload: string; created_at: string; revision: number };

declare global {
  // Conservé pendant les rechargements de modules en développement.
  var __prospectionDb: Database.Database | undefined;
}

export function initializeDb(db: Database.Database): void {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS targeting_profiles (
      version INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      input_type TEXT NOT NULL,
      input_payload TEXT NOT NULL,
      duplicate_key TEXT NOT NULL,
      profile_version INTEGER NOT NULL REFERENCES targeting_profiles(version),
      profile_snapshot TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending_analysis')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS test_runs_duplicate_key ON test_runs(duplicate_key, created_at DESC);
    CREATE TABLE IF NOT EXISTS source_records (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES test_runs(id),
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dossiers (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE REFERENCES test_runs(id),
      schema_version INTEGER NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      dossier_id TEXT NOT NULL REFERENCES dossiers(id),
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outreach_drafts (
      id TEXT PRIMARY KEY,
      dossier_id TEXT NOT NULL REFERENCES dossiers(id),
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  const columns = db.prepare("PRAGMA table_info(dossiers)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "revision")) db.exec("ALTER TABLE dossiers ADD COLUMN revision INTEGER NOT NULL DEFAULT 1");
  db.exec(`
    CREATE TABLE IF NOT EXISTS dossier_revisions (id TEXT PRIMARY KEY, dossier_id TEXT NOT NULL REFERENCES dossiers(id), revision INTEGER NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(dossier_id, revision));
    CREATE TABLE IF NOT EXISTS collections (run_id TEXT PRIMARY KEY REFERENCES test_runs(id), payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workflows (run_id TEXT PRIMARY KEY REFERENCES test_runs(id), state TEXT NOT NULL, error TEXT, started_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_calls (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), revision INTEGER NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL, provider_id TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(run_id, revision));
    CREATE TABLE IF NOT EXISTS delivery_previews (id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES test_runs(id), revision INTEGER NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS delivery_attempts (id TEXT PRIMARY KEY, delivery_id TEXT NOT NULL REFERENCES deliveries(id), state TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL);
  `);
}

export function getDb(): Database.Database {
  if (!globalThis.__prospectionDb) {
    const filename = process.env.DATABASE_PATH
      ? path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH)
      : path.join(process.cwd(), ".data", "prospection.db");
    mkdirSync(path.dirname(filename), { recursive: true });
    globalThis.__prospectionDb = new Database(filename);
    initializeDb(globalThis.__prospectionDb);
  }
  return globalThis.__prospectionDb;
}

function profileFromRow(row: ProfileRow): StoredProfile {
  return { version: row.version, criteria: targetingProfileSchema.parse(JSON.parse(row.payload)), createdAt: row.created_at };
}

function runFromRow(row: RunRow): StoredRun {
  return {
    id: row.id,
    label: row.label,
    inputType: row.input_type,
    input: testInputSchema.parse(JSON.parse(row.input_payload)),
    duplicateKey: row.duplicate_key,
    profileVersion: row.profile_version,
    profileSnapshot: targetingProfileSchema.parse(JSON.parse(row.profile_snapshot)),
    status: row.status,
    dossierReady: !!row.dossier_ready,
    createdAt: row.created_at,
  };
}

export function getLatestProfile(db: Database.Database): StoredProfile | null {
  const row = db.prepare("SELECT version, payload, created_at FROM targeting_profiles ORDER BY version DESC LIMIT 1").get() as ProfileRow | undefined;
  return row ? profileFromRow(row) : null;
}

export function saveProfile(db: Database.Database, input: TargetingProfile): StoredProfile {
  const criteria = targetingProfileSchema.parse(input);
  return db.transaction(() => {
    const version = ((db.prepare("SELECT MAX(version) AS version FROM targeting_profiles").get() as { version: number | null }).version || 0) + 1;
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO targeting_profiles(version, payload, created_at) VALUES (?, ?, ?)").run(version, JSON.stringify(criteria), createdAt);
    return { version, criteria, createdAt };
  }).immediate();
}

export function listRuns(db: Database.Database, limit = 50): StoredRun[] {
  const rows = db.prepare("SELECT r.*, EXISTS(SELECT 1 FROM dossiers d WHERE d.run_id = r.id) AS dossier_ready FROM test_runs r ORDER BY r.created_at DESC, r.rowid DESC LIMIT ?").all(limit) as RunRow[];
  return rows.map(runFromRow);
}

export function getRun(db: Database.Database, id: string): StoredRun | null {
  const row = db.prepare("SELECT r.*, EXISTS(SELECT 1 FROM dossiers d WHERE d.run_id = r.id) AS dossier_ready FROM test_runs r WHERE r.id = ?").get(id) as RunRow | undefined;
  return row ? runFromRow(row) : null;
}

export function findDuplicates(db: Database.Database, inputs: TestInput[]): DuplicateMatch[] {
  const seen = new Map<string, string>();
  const matches: DuplicateMatch[] = [];
  for (const [index, rawInput] of inputs.entries()) {
    const input = testInputSchema.parse(rawInput);
    const key = duplicateKey(input);
    const previous = db.prepare("SELECT id, label FROM test_runs WHERE duplicate_key = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get(key) as { id: string; label: string } | undefined;
    const inBatch = seen.get(key);
    if (previous || inBatch) matches.push({ index, label: inputLabel(input), previousRunId: previous?.id || null, previousLabel: previous?.label || inBatch || null });
    seen.set(key, inputLabel(input));
  }
  return matches;
}

export class DuplicateError extends Error {
  constructor(public matches: DuplicateMatch[]) {
    super("Une ou plusieurs associations ont déjà été examinées.");
  }
}

export function createRuns(db: Database.Database, rawInputs: TestInput[], allowDuplicates = false): StoredRun[] {
  if (rawInputs.length < 1 || rawInputs.length > 10) throw new Error("Choisissez de 1 à 10 associations.");
  const inputs = rawInputs.map((input) => testInputSchema.parse(input));
  return db.transaction(() => {
    const profile = getLatestProfile(db);
    if (!profile) throw new Error("Enregistrez d’abord votre ciblage.");
    const duplicates = findDuplicates(db, inputs);
    if (duplicates.length && !allowDuplicates) throw new DuplicateError(duplicates);
    const createdAt = new Date().toISOString();
    const insert = db.prepare("INSERT INTO test_runs(id, label, input_type, input_payload, duplicate_key, profile_version, profile_snapshot, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    return inputs.map((input) => {
      const id = randomUUID();
      const label = inputLabel(input);
      const key = duplicateKey(input);
      const normalized = input.url ? { ...input, url: canonicalizeUrl(input.url) } : input;
      insert.run(id, label, input.type, JSON.stringify(normalized), key, profile.version, JSON.stringify(profile.criteria), "pending_analysis", createdAt);
      return { id, label, inputType: input.type, input: normalized, duplicateKey: key, profileVersion: profile.version, profileSnapshot: profile.criteria, status: "pending_analysis" as const, dossierReady: false, createdAt };
    });
  }).immediate();
}

export function getDossier(db: Database.Database, runId: string): StoredDossier | null {
  const row = db.prepare("SELECT id, run_id, payload, created_at, revision FROM dossiers WHERE run_id = ?").get(runId) as DossierRow | undefined;
  return row ? { id: row.id, runId: row.run_id, createdAt: row.created_at, revision: row.revision, content: dossierSchema.parse(JSON.parse(row.payload)) } : null;
}

export function saveDossier(db: Database.Database, runId: string, raw: Dossier): StoredDossier {
  const content = dossierSchema.parse(raw);
  return db.transaction(() => {
    if (!getRun(db, runId)) throw new Error("Test introuvable.");
    if (getDossier(db, runId)) throw new Error("Ce test possède déjà un dossier.");
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO dossiers(id, run_id, schema_version, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(id, runId, content.schemaVersion, JSON.stringify(content), createdAt);
    const sourceInsert = db.prepare("INSERT INTO source_records(id, run_id, payload, created_at) VALUES (?, ?, ?, ?)");
    for (const source of content.sources) sourceInsert.run(source.id, runId, JSON.stringify(source), createdAt);
    const claimInsert = db.prepare("INSERT INTO claims(id, dossier_id, payload) VALUES (?, ?, ?)");
    for (const claim of content.claims) claimInsert.run(claim.id, id, JSON.stringify(claim));
    if (content.draft) {
      db.prepare("INSERT INTO outreach_drafts(id, dossier_id, payload, created_at) VALUES (?, ?, ?, ?)").run(randomUUID(), id, JSON.stringify(content.draft), createdAt);
    }
    return { id, runId, createdAt, revision: 1, content };
  }).immediate();
}
