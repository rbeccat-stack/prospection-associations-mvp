import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient, type Client } from "@libsql/client";
import { dossierSchema } from "../src/lib/schemas";
import { createRuns, ensureProfile, getRun, initializeDb, row, run as sqlRun, saveProfile } from "../src/lib/store";
import { defaultProfile } from "../src/lib/schemas";
import { collectPage, siteLinks, type CollectedPage } from "../src/lib/collector";
import { domainRecords, eligibleDomains, joafeIdFromUrl, joafeNoticeUrl, normalizeWebsite, shuffle } from "../src/lib/joafe";
import { advanceEdition, closeEdition, INTEGRATED_PROFILE, publication, startEdition, type EngineDeps } from "../src/lib/engine";
import { workflow } from "../src/lib/workflow";
import { HttpError } from "../src/lib/http";

// Identity permutation: shuffle(items, keep) returns items unchanged.
const keep = (max: number) => max - 1;

const nomenclature = [
  { domaine_path: "6000/", domaine_libelle: "culture, pratiques d’activités artistiques, culturelles" },
  { domaine_path: "6000/6030", domaine_libelle: "chant choral, musique" },
  { domaine_path: "6000/6025", domaine_libelle: "photographie, cinéma (dont ciné-clubs)" },
  { domaine_path: "1000/", domaine_libelle: "activités politiques" },
  { domaine_path: "1000/1005", domaine_libelle: "soutien et financement de partis" },
];
const counts = [
  { code: "6000/", n: 149 }, { code: "6000/6030", n: 30 }, { code: "6000/6025", n: 12 },
  { code: "1000/1005", n: 50 }, { code: "6000/6040", n: 3 }, { code: null, n: 40 },
];
const notice = (rna: string, title: string, siteweb: string | null, extra: Record<string, unknown> = {}) => ({
  id: String(202600000000 + Number(rna.slice(1))), numero_rna: rna, titre: title, siteweb, objet: `Objet de ${title}`,
  adresse_actuelle: "1 rue Exemple", codepostal_actuel: "69001", commune_actuelle: "Lyon 1", dateparution: "2026-10-01",
  datedeclaration: "2026-09-01", typeavis: "Création", dca_siren: null, domaine_activite_libelle_categorise: ["culture/chant choral, musique"], ...extra,
});
const music = [
  notice("W690000001", "CHORALE A", "https://chorale-a.example", { objet: null, typeavis: "Modification", dateparution: "2026-10-10" }),
  notice("W690000002", "ORCHESTRE B", "www.orchestre-b.example"),
  notice("W690000003", "FANFARE DISSOUTE", "https://fanfare.example"),
  notice("W690000004", "GROUPE FACEBOOK", "https://www.facebook.com/groupe"),
  notice("W690000005", "ENSEMBLE VILLEURBANNE", "https://villeurbanne.example", { codepostal_actuel: "69100" }),
  notice("W690000006", "CHOEUR C", "https://choeur-c.example/?utm_source=jo"),
  notice("W690000007", "JAZZ D", "https://jazz-d.example"),
  notice("W690000001", "CHORALE A", "https://chorale-a.example", { objet: "Chanter ensemble à Lyon", dateparution: "2025-01-01" }),
];
const cinema = [notice("W690000101", "CINÉ-CLUB E", "https://cine-e.example", { domaine_activite_libelle_categorise: ["culture/photographie, cinéma"] })];

const joafeFetcher = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  const where = url.searchParams.get("where") || "";
  if (url.pathname.includes("/joafe_domaine_activite/")) return Response.json({ total_count: nomenclature.length, results: url.searchParams.get("offset") === "0" ? nomenclature : [] });
  if (url.searchParams.get("group_by")) return Response.json({ total_count: counts.length, results: counts });
  if (where.includes('typeavis = "Dissolution"')) return Response.json({ results: where.includes("W690000003") ? [{ numero_rna: "W690000003" }] : [] });
  if (url.searchParams.get("offset") !== "0") return Response.json({ results: [] });
  if (where.includes('"6000/6030"')) return Response.json({ results: music });
  if (where.includes('"6000/6025"')) return Response.json({ results: cinema });
  return Response.json({ results: [] });
}) as typeof fetch;

function sitePage(url: string, text = "Bienvenue. Un agenda est publié chaque mois pour nos concerts et répétitions ouvertes à tous.", available = true): CollectedPage {
  return { source: { id: randomUUID(), url, label: new URL(url).hostname, origin: "public_page", consultedAt: new Date().toISOString(), accessStatus: available ? "available" : "unavailable" }, text: available ? text : "", ...(available ? {} : { error: "Le site répond HTTP 404." }) };
}

function fakeDossier(pages: CollectedPage[], withOpportunity: boolean) {
  const site = pages.find(page => !page.source.url?.startsWith("https://www.journal-officiel.gouv.fr/"))!;
  const claimId = randomUUID();
  return dossierSchema.parse({
    schemaVersion: 1, preparation: "ai_assisted", associationName: "Association", summary: "Activité musicale locale", summarySourceIds: [site.source.id],
    identity: { location: "", website: "", activity: "", sourceIds: { location: [], website: [], activity: [] } },
    sources: pages.map(page => page.source),
    claims: [{ id: claimId, text: "Un agenda est publié chaque mois", kind: "fact", sourceIds: [site.source.id], verification: "sourced", evidence: [{ sourceId: site.source.id, quote: "Un agenda est publié chaque mois" }] }],
    contacts: [], signals: [{ claimId, interpretation: "Mise à jour régulière à confirmer", confidence: "medium" }], matches: [],
    opportunities: withOpportunity ? [{ title: "Agenda", observation: "Agenda mensuel", service: "Site", firstDeliverable: "Prototype", factClaimIds: [claimId], toVerify: "Qui le met à jour ?", priority: "recommended" }] : [],
    approach: { angle: "Parler de l’agenda", rationale: "", sourceIds: [], toVerify: [] }, reservations: [], confidence: "medium", confidenceReason: "Test",
  });
}

async function database() {
  const db = createClient({ url: "file::memory:" });
  await initializeDb(db);
  return db;
}

function engineDeps(db: Client, calls: { collect: string[]; analyze: string[] }, failures: { limit?: boolean } = {}): EngineDeps {
  return {
    fetcher: joafeFetcher, random: keep,
    collect: async website => { calls.collect.push(website); return [sitePage(website, undefined, !website.includes("orchestre-b"))]; },
    analyze: async (database, runInfo, pages) => {
      if (failures.limit) throw new HttpError(429, "Limite quotidienne d'appels IA atteinte (journée UTC).");
      calls.analyze.push(runInfo.input.url || "");
      const id = randomUUID();
      await sqlRun(database, "INSERT INTO ai_calls VALUES (?, ?, ?)", [id, runInfo.id, new Date().toISOString()]);
      await sqlRun(database, "INSERT INTO analysis_diagnostics(id, run_id, payload, created_at) VALUES (?, ?, ?, ?)", [id, runInfo.id, JSON.stringify({ id, cost: 0.002 }), new Date().toISOString()]);
      return fakeDossier(pages, (runInfo.input.url || "").includes("chorale-a"));
    },
  };
}

test("moteur : sites déclarés normalisés, réseaux sociaux et identifiants écartés", () => {
  assert.equal(normalizeWebsite("www.orchestre-b.example"), "https://www.orchestre-b.example/");
  assert.equal(normalizeWebsite("https://choeur-c.example/?utm_source=jo&page=2#haut"), "https://choeur-c.example/?page=2");
  for (const value of ["https://www.facebook.com/groupe", "https://linktr.ee/x", "https://user:pass@site.example", "https://site.example:8443", "ftp://site.example", "", null]) assert.equal(normalizeWebsite(value), null, String(value));
});

test("moteur : pages clés du même site choisies par priorité, sans fichiers ni autres domaines", () => {
  const html = `<a href="/agenda">Agenda</a><a href="https://autre.example/contact">Contact ailleurs</a><a href="/">Accueil</a><a href="/statuts.pdf">Statuts</a>
    <a href="https://www.asso.example/nous-contacter">Écrire</a><a href="/adhesion">Adhérer</a><a href="/qui-sommes-nous">Qui sommes-nous</a><a href="/benevoles">Bénévoles</a><a href="mailto:a@asso.example">Mail</a>`;
  assert.deepEqual(siteLinks(html, "https://asso.example/", 4), ["https://www.asso.example/nous-contacter", "https://asso.example/adhesion", "https://asso.example/qui-sommes-nous", "https://asso.example/agenda"]);
  assert.deepEqual(siteLinks(html, "https://asso.example/", 1), ["https://www.asso.example/nous-contacter"]);
});

test("moteur : catégories précises seulement, familles politiques et petites catégories exclues", async () => {
  const domains = await eligibleDomains(joafeFetcher);
  assert.deepEqual(domains.map(domain => domain.code), ["6000/6030", "6000/6025"]);
  assert.equal(domains[0].label, "chant choral, musique");
  assert.equal(domains[0].family, "culture, pratiques d’activités artistiques, culturelles");
  assert.deepEqual(shuffle([1, 2, 3], keep), [1, 2, 3]);
  assert.deepEqual(shuffle([1, 2, 3], () => 0), [2, 3, 1]);
});

test("moteur : une association par RNA, objet conservé, dissoutes et hors Lyon écartées", async () => {
  const records = await domainRecords("6000/6030", joafeFetcher);
  assert.deepEqual(records.map(record => record.rna), ["W690000001", "W690000002", "W690000006", "W690000007"]);
  assert.equal(records[0].objet, "Chanter ensemble à Lyon");
  assert.equal(records[1].website, "https://www.orchestre-b.example/");
  await assert.rejects(domainRecords('6000/6030" or "1"="1', joafeFetcher), /Catégorie invalide/);
});

test("moteur : annonce du Journal officiel relue via l’API, jamais via la page JavaScript", async () => {
  const url = joafeNoticeUrl("202600000001");
  assert.equal(joafeIdFromUrl(url), "202600000001");
  assert.equal(joafeIdFromUrl("https://example.org/pages/associations-detail-annonce/?q.id=id:202600000001"), null);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.ok(String(input).includes("jo_associations"));
    return Response.json({ results: [music[7]] });
  }) as typeof fetch;
  try {
    const page = await collectPage(url);
    assert.equal(page.source.accessStatus, "available");
    assert.ok(page.text.includes("Numéro RNA : W690000001"));
    assert.ok(page.text.includes("Objet déclaré : Chanter ensemble à Lyon"));
  } finally { globalThis.fetch = oldFetch; }
});

test("moteur : édition tirée sans doublon, ciblage intégré versionné une seule fois", async () => {
  const db = await database();
  await saveProfile(db, defaultProfile);
  await createRuns(db, [{ type: "url", url: "https://jazz-d.example/" }]);
  const edition = await startEdition(db, { fetcher: joafeFetcher, random: keep });
  assert.equal(edition.domainCode, "6000/6030");
  assert.deepEqual(edition.candidates.map(candidate => candidate.rna), ["W690000001", "W690000002", "W690000006"]);
  await assert.rejects(startEdition(db, { fetcher: joafeFetcher, random: keep }), /déjà en cours/);
  const profile = await ensureProfile(db, INTEGRATED_PROFILE);
  assert.equal((await ensureProfile(db, INTEGRATED_PROFILE)).version, profile.version);
  await closeEdition(db, edition.id);
  // The previous category is not drawn twice in a row.
  const next = await startEdition(db, { fetcher: joafeFetcher, random: keep });
  assert.equal(next.domainCode, "6000/6025");
  db.close();
});

test("moteur : collecte puis analyse pas à pas, site illisible écarté sans appel IA", async () => {
  const db = await database();
  const calls = { collect: [] as string[], analyze: [] as string[] };
  const deps = engineDeps(db, calls);
  let edition = await startEdition(db, deps);
  const states: string[] = [];
  while (edition.state === "running") { edition = await advanceEdition(db, edition.id, deps); states.push(edition.candidates.map(candidate => candidate.state).join(",")); }
  assert.deepEqual(edition.candidates.map(candidate => candidate.state), ["ready", "skipped", "research", "research"]);
  assert.equal(states[0], "collected,pending,pending,pending");
  assert.equal(calls.analyze.length, 3);
  assert.equal(calls.collect.length, 4);
  assert.equal(edition.analysesUsed, 3);
  assert.ok(Math.abs((edition.cost ?? 0) - 0.006) < 1e-9);
  assert.equal(edition.candidates[1].reason, "Le site répond HTTP 404.");
  assert.equal(edition.candidates[2].reason, "Aucune intervention appuyée sur un fait vérifié.");
  const runInfo = (await getRun(db, edition.candidates[0].runId!))!;
  assert.equal(runInfo.profileSnapshot.name, INTEGRATED_PROFILE.name);
  assert.ok(runInfo.input.type === "manual" && runInfo.input.sourceNote?.includes("RNA W690000001"));
  assert.equal((await workflow(db, edition.candidates[1].runId!))?.state, "failed");
  db.close();
});

test("moteur : plafond d’analyses respecté puis candidats restants non examinés", async () => {
  const db = await database();
  const calls = { collect: [] as string[], analyze: [] as string[] };
  const deps = engineDeps(db, calls);
  let edition = await startEdition(db, deps);
  await sqlRun(db, "UPDATE editions SET max_analyses = 1 WHERE id = ?", [edition.id]);
  while (edition.state === "running") edition = await advanceEdition(db, edition.id, deps);
  assert.equal(calls.analyze.length, 1);
  assert.deepEqual(edition.candidates.map(candidate => candidate.state), ["ready", "unused", "unused", "unused"]);
  db.close();
});

test("moteur : limite quotidienne mise en pause, reprise sans double collecte", async () => {
  const db = await database();
  const calls = { collect: [] as string[], analyze: [] as string[] };
  let edition = await startEdition(db, engineDeps(db, calls));
  edition = await advanceEdition(db, edition.id, engineDeps(db, calls));
  edition = await advanceEdition(db, edition.id, engineDeps(db, calls, { limit: true }));
  assert.equal(edition.state, "paused");
  assert.match(edition.error || "", /Limite quotidienne/);
  assert.equal(edition.candidates[0].state, "collected");
  assert.equal((await workflow(db, edition.candidates[0].runId!))?.state, "collected");
  edition = await advanceEdition(db, edition.id, engineDeps(db, calls));
  assert.equal(edition.state, "running");
  assert.equal(edition.candidates[0].state, "ready");
  assert.equal(calls.collect.length, 1);
  db.close();
});

test("moteur : étape concurrente refusée et carte publiée seulement avec un fait du site", async () => {
  const db = await database();
  const edition = await startEdition(db, { fetcher: joafeFetcher, random: keep });
  await sqlRun(db, "UPDATE editions SET lock_until = ? WHERE id = ?", [new Date(Date.now() + 60_000).toISOString(), edition.id]);
  await assert.rejects(advanceEdition(db, edition.id, { collect: async () => [] }), /déjà en cours/);
  await assert.rejects(closeEdition(db, edition.id), /étape est en cours/);
  assert.ok(await row(db, "SELECT 1 FROM editions WHERE id = ? AND state = 'running'", [edition.id]));
  const notice = sitePage("https://www.journal-officiel.gouv.fr/pages/associations-detail-annonce/?q.id=id:202600000001");
  const site = sitePage("https://chorale-a.example/");
  const dossier = fakeDossier([site, notice], true);
  assert.equal(publication(dossier, new Set([site.source.id])).state, "ready");
  assert.deepEqual(publication(dossier, new Set()), { state: "research", reason: "Aucun fait tiré du site de l’association." });
  db.close();
});
