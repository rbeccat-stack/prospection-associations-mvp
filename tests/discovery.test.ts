import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { discoverLyon, discoveryUrl, directorySirenFromUrl, officialRecord } from "../src/lib/discovery";
import { dossierSchema } from "../src/lib/schemas";
import { associationSourceRequired } from "../src/lib/analysis-readiness";
import { collectPage } from "../src/lib/collector";

test("découverte : recherche limitée aux associations actives des neuf arrondissements", () => {
  const url = new URL(discoveryUrl(2));
  assert.equal(url.hostname, "recherche-entreprises.api.gouv.fr");
  assert.equal(url.searchParams.get("est_association"), "true");
  assert.equal(url.searchParams.get("etat_administratif"), "A");
  assert.equal(url.searchParams.get("code_postal"), "69001,69002,69003,69004,69005,69006,69007,69008,69009");
  assert.equal(url.searchParams.get("page"), "2");
  assert.throws(() => discoveryUrl(0));
  assert.throws(() => discoveryUrl(1001));
});

test("découverte : noms, implantations et provenance restent traçables", async () => {
  const fixture = {
    page: 1, total_pages: 3, total_results: 41,
    results: [
      { siren: "123456789", nom_complet: "Association test", activite_principale: "94.99Z", etat_administratif: "A", siege: { adresse: "PARIS", code_postal: "75001" }, matching_etablissements: [{ adresse: "10 RUE EXEMPLE 69007 LYON", code_postal: "69007" }] },
      { siren: "123456789", nom_complet: "Doublon", etat_administratif: "A" },
      { siren: "987654321", nom_complet: "Association fermée", etat_administratif: "C" },
    ],
  };
  const fetcher = async () => Response.json(fixture);
  const page = await discoverLyon(1, fetcher as typeof fetch);
  assert.equal(page.candidates.length, 1);
  assert.equal(page.candidates[0].address, "10 RUE EXEMPLE 69007 LYON");
  assert.equal(page.candidates[0].officialUrl, "https://annuaire-entreprises.data.gouv.fr/entreprise/123456789");
  assert.equal(page.totalResults, 41);
});

test("collecte : la page JavaScript de l’annuaire est remplacée par son API officielle", async () => {
  const url = "https://annuaire-entreprises.data.gouv.fr/entreprise/814392452";
  assert.equal(directorySirenFromUrl(url), "814392452");
  assert.equal(directorySirenFromUrl("https://recherche-entreprises.api.gouv.fr/search?q=814392452&per_page=1"), "814392452");
  assert.equal(directorySirenFromUrl("https://example.org/entreprise/814392452"), null);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.ok(String(input).includes("q=814392452"));
    return Response.json({ page: 1, total_pages: 1, total_results: 1, results: [{ siren: "814392452", nom_complet: "A VELO SANS AGE", etat_administratif: "A", activite_principale: "94.99Z", tranche_effectif_salarie: "NN", siege: { adresse: "99 RUE DE LA PART-DIEU 69003 LYON", code_postal: "69003" } }] });
  };
  try {
    const page = await collectPage(url);
    assert.equal(page.source.accessStatus, "available");
    assert.ok(page.source.url?.includes("q=814392452"));
    assert.ok(page.text.includes("A VELO SANS AGE"));
    assert.ok(page.text.includes("inconnue (NN ne signifie pas zéro salarié)"));
    assert.ok((await officialRecord("814392452")).text.includes("SIREN : 814392452"));
  } finally { globalThis.fetch = oldFetch; }
});

test("analyse : une fiche issue de l’annuaire attend une vraie source d’activité", () => {
  const input = { type: "manual" as const, name: "A VELO SANS AGE", url: "https://annuaire-entreprises.data.gouv.fr/entreprise/814392452" };
  const directoryPage = { source: { id: randomUUID(), label: "Annuaire", origin: "public_page" as const, url: "https://recherche-entreprises.api.gouv.fr/search?q=814392452&per_page=1", accessStatus: "available" as const }, text: "Nom déclaré : A VELO SANS AGE" };
  assert.equal(associationSourceRequired(input, [directoryPage]), true);
  assert.equal(associationSourceRequired(input, [directoryPage, { source: { ...directoryPage.source, id: randomUUID(), url: "https://association.example.org/activites" }, text: "Activités publiques" }]), false);
});

test("analyse : intervention sans fait sourcé refusée", () => {
  const sourceId = randomUUID(), claimId = randomUUID();
  const dossier = {
    schemaVersion: 1, preparation: "ai_assisted", associationName: "Association test", summary: "Activité locale", summarySourceIds: [sourceId],
    identity: { location: "Lyon", website: "", activity: "", sourceIds: { location: [sourceId], website: [], activity: [] } },
    sources: [{ id: sourceId, label: "Source", origin: "public_page", url: "https://example.org", accessStatus: "available" }],
    claims: [{ id: claimId, text: "Un agenda est publié", kind: "fact", sourceIds: [sourceId], verification: "sourced", evidence: [{ sourceId, quote: "Un agenda est publié" }] }],
    contacts: [], signals: [], qualification: { digitalDebt: { assessment: "À vérifier", claimIds: [], unknowns: [] }, absorption: { assessment: "À vérifier", claimIds: [], unknowns: [] } }, matches: [],
    opportunities: [{ title: "Agenda", observation: "Agenda public", service: "Amélioration du site", firstDeliverable: "Prototype d’agenda", factClaimIds: [claimId], toVerify: "Qui le met à jour ?", priority: "recommended" }],
    approach: { angle: "Parler de l’agenda", rationale: "L’agenda est publié", sourceIds: [sourceId], toVerify: [] },
    reservations: [], confidence: "low", confidenceReason: "Sources limitées",
  };
  assert.ok(dossierSchema.parse(dossier).opportunities?.length);
  assert.throws(() => dossierSchema.parse({ ...dossier, opportunities: [{ ...dossier.opportunities[0], factClaimIds: [randomUUID()] }] }), /intervention proposée exige un fait sourcé/);
});
