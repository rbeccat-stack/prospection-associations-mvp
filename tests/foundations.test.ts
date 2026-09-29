import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { parseCsvInputs } from "../src/lib/csv";
import { canonicalizeUrl, claimSchema, defaultProfile, dossierSchema, type TestInput } from "../src/lib/schemas";
import { createRuns, DuplicateError, getDossier, getRun, initializeDb, listRuns, row, saveDossier, saveProfile } from "../src/lib/store";

test("un test garde le ciblage utilisé, même après une modification", async () => {
  const db = createClient({ url: "file::memory:" });
  await initializeDb(db);
  const v1 = await saveProfile(db, { ...defaultProfile, name: "Premier ciblage", regions: ["Lyon"] });
  const input: TestInput = { type: "manual", name: "Association Alpha", location: "Lyon", url: "", activity: "", summary: "", sourceNote: "" };
  const [run] = await createRuns(db, [input]);
  const v2 = await saveProfile(db, { ...defaultProfile, name: "Ciblage revu", regions: ["Paris"] });
  assert.equal(v1.version, 1);
  assert.equal(v2.version, 2);
  assert.deepEqual((await getRun(db, run.id))?.profileSnapshot.regions, ["Lyon"]);
  assert.equal((await getRun(db, run.id))?.profileVersion, 1);
  db.close();
});

test("un doublon est signalé et un nouveau test explicite préserve l’historique", async () => {
  const db = createClient({ url: "file::memory:" });
  await initializeDb(db);
  await saveProfile(db, defaultProfile);
  const first: TestInput = { type: "url", url: "https://www.exemple.org/?utm_source=test", name: "Exemple" };
  const second: TestInput = { type: "url", url: "https://exemple.org", name: "Exemple revu" };
  await createRuns(db, [first]);
  await assert.rejects(createRuns(db, [second]), DuplicateError);
  assert.equal((await listRuns(db)).length, 1);
  await createRuns(db, [second], true);
  assert.equal((await listRuns(db)).length, 2);
  assert.equal(canonicalizeUrl(first.url), canonicalizeUrl(second.url));
  db.close();
});

test("un import CSV valide ses colonnes et sa limite avant création", () => {
  const rows = parseCsvInputs("nom,url,localisation\nAssociation A,https://exemple.org,Lille\nAssociation B,,Paris");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].type, "csv");
  assert.throws(() => parseCsvInputs("url\nhttps://exemple.org"), /colonne nom/i);
  const tooMany = "nom\n" + Array.from({ length: 11 }, (_, i) => `Association ${i}`).join("\n");
  assert.throws(() => parseCsvInputs(tooMany), /1 à 10 lignes/);
});

test("les faits sans source et les références inconnues sont refusés", () => {
  const sourceId = "90df80a7-d419-4eaa-9b6e-548035d65e46";
  const claimId = "7ce76be0-a256-41e1-84d6-7275bab1eac4";
  assert.equal(claimSchema.safeParse({ id: claimId, text: "Contact identifié", kind: "fact", sourceIds: [], verification: "sourced" }).success, false);
  const dossier = {
    schemaVersion: 1,
    preparation: "manual",
    associationName: "Association A",
    summary: "",
    summarySourceIds: [],
    identity: { location: "", website: "", activity: "", sourceIds: { location: [], website: [], activity: [] } },
    sources: [],
    claims: [{ id: claimId, text: "Localisation", kind: "fact", sourceIds: [sourceId], verification: "sourced" }],
    contacts: [],
    signals: [],
    matches: [],
    approach: { angle: "Question ouverte", rationale: "", sourceIds: [], toVerify: [] },
    reservations: [],
    confidence: "low",
    confidenceReason: "Source manquante",
  };
  assert.equal(dossierSchema.safeParse(dossier).success, false);
});

test("le dossier manuel Artis est validé, conservé séparément et retrouvé", async () => {
  const db = createClient({ url: "file::memory:" });
  await initializeDb(db);
  await saveProfile(db, defaultProfile);
  const [run] = await createRuns(db, [{ type: "manual", name: "Artis musique", url: "", location: "", activity: "", summary: "", sourceNote: "" }]);
  const raw = JSON.parse(readFileSync(new URL("../examples/artis-mbc-dossier.json", import.meta.url), "utf8"));
  const content = dossierSchema.parse(raw);
  await saveDossier(db, run.id, content);
  assert.equal((await getRun(db, run.id))?.dossierReady, true);
  assert.equal((await getDossier(db, run.id))?.content.contacts.length, 2);
  assert.equal((await row<{ count: number }>(db, "SELECT COUNT(*) AS count FROM source_records WHERE run_id = ?", [run.id]))?.count, 4);
  await assert.rejects(saveDossier(db, run.id, content), /déjà un dossier/);
  db.close();
});

test("les deux cas pilotes sont valides et un site inaccessible ne suffit pas à sourcer un fait", () => {
  for (const name of ["kotopo", "anciela"]) {
    const raw = JSON.parse(readFileSync(new URL(`../examples/${name}-dossier.json`, import.meta.url), "utf8"));
    assert.equal(dossierSchema.safeParse(raw).success, true);
  }
  const kotopo = JSON.parse(readFileSync(new URL("../examples/kotopo-dossier.json", import.meta.url), "utf8"));
  const unavailableSourceId = kotopo.sources.find((source: { accessStatus: string }) => source.accessStatus === "unavailable").id;
  kotopo.claims[0].sourceIds = [unavailableSourceId];
  assert.equal(dossierSchema.safeParse(kotopo).success, false);
});
