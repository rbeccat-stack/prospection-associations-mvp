import test from "node:test";
import assert from "node:assert/strict";
import { companyEditableSchema, emptyCompany, importDirectoryCompany, isPublicWebUrl, parsePilotState, saveCompany } from "../src/lib/company-records";
import type { DirectoryCompany } from "../src/lib/company-search-shared";

const directory: DirectoryCompany = { siren: "901931105", name: "MUODIM", activityCode: "62.01Z", createdAt: "2021-07-29", workforce: "3 à 5 salariés", workforceYear: "2024", headOffice: "Lyon", localAddress: "Lyon", localSiret: "90193110500018", officialUrl: "https://annuaire-entreprises.data.gouv.fr/entreprise/901931105", consultedAt: "2026-11-04T10:00:00.000Z" };
const legacy = { companies: [{ id: "muodim", name: "Mon nom personnalisé", sector: "Imagerie", city: "Lyon", description: "Mon analyse", signal: "Un fait sourcé", idea: "Une hypothèse", email: "contact@example.com", source: "https://example.com/annonce" }], choices: { muodim: "keep" }, decisions: { muodim: "prospect" }, subjects: { muodim: "Mon objet" }, messages: { muodim: "Mon brouillon" } };

test("migration : sélection historique, ancienne source et brouillons conservés", () => {
  const state = parsePilotState(legacy), c = state.companies[0];
  assert.equal(c.siren, directory.siren); assert.equal(c.notes, "");
  assert.equal(c.sources[0].url, legacy.companies[0].source); assert.equal(c.sources[0].consultedOn, "");
  assert.deepEqual(state.choices, legacy.choices); assert.deepEqual(state.messages, legacy.messages);
  assert.deepEqual(parsePilotState(JSON.parse(JSON.stringify(state))), state);
});
test("import répété : un SIREN unique, actualisation du snapshot sans effacer les annotations", () => {
  const original = parsePilotState(legacy);
  const first = importDirectoryCompany(original, directory);
  const annotated = { ...first, companies: [saveCompany(first.companies[0], { ...first.companies[0], notes: "À appeler mardi" })] };
  const next = importDirectoryCompany(annotated, { ...directory, name: "NOUVELLE DÉNOMINATION", localAddress: "Nouvelle adresse", consultedAt: "2026-11-05T10:00:00.000Z" });
  assert.equal(next.companies.length, 1); assert.equal(next.companies[0].id, "muodim");
  assert.equal(next.companies[0].name, "Mon nom personnalisé"); assert.equal(next.companies[0].notes, "À appeler mardi");
  assert.equal(next.companies[0].directory?.name, "NOUVELLE DÉNOMINATION");
  assert.deepEqual(next.companies[0].sources, annotated.companies[0].sources);
  assert.deepEqual(next.choices, original.choices); assert.deepEqual(next.decisions, original.decisions);
  assert.deepEqual(next.messages, original.messages); assert.deepEqual(next.subjects, original.subjects);
  assert.equal(original.companies[0].directory, undefined);
});
test("nouvel import : pas de besoin inventé, aucun doublon entre établissements/pages", () => {
  const state = parsePilotState({ ...legacy, companies: [] });
  const first = importDirectoryCompany(state, directory);
  const second = importDirectoryCompany(first, { ...directory, localSiret: "90193110500026" });
  assert.equal(second.companies.length, 1); assert.equal(second.companies[0].signal, "");
  assert.equal(second.companies[0].idea, ""); assert.equal(second.companies[0].directory?.localSiret, "90193110500026");
  assert.equal(second.choices[second.companies[0].id], undefined);
});
test("édition : sources/notes modifiables, identité et snapshot officiels protégés", () => {
  const c = importDirectoryCompany(parsePilotState(legacy), directory).companies[0];
  const updated = saveCompany(c, { ...c, name: "Mon libellé", description: "Description rédigée", notes: "Une note", siren: "111111111", directory: { ...directory, workforce: "999 salariés" } } as typeof c, "2026-11-04T11:00:00.000Z");
  assert.equal(updated.name, "Mon libellé"); assert.equal(updated.updatedAt, "2026-11-04T11:00:00.000Z");
  assert.deepEqual(updated.directory, directory); assert.equal(updated.siren, directory.siren);
  assert.equal(c.name, "Mon nom personnalisé");
});
test("suppression d’une ancienne source : elle ne réapparaît pas au rechargement", () => {
  const state = parsePilotState(legacy);
  const updated = saveCompany(state.companies[0], { ...state.companies[0], sources: [] });
  assert.equal(parsePilotState({ ...state, companies: [updated] }).companies[0].sources.length, 0);
});
test("validation : URL dangereuse, email et dates invalides refusés sans exception parasite", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "https://user:password@example.com"]) {
    assert.equal(isPublicWebUrl(url), false);
    assert.equal(companyEditableSchema.safeParse({ ...emptyCompany, name: "Test", sources: [{ id: "s", label: "Source", url, consultedOn: "" }] }).success, false);
  }
  for (const consultedOn of ["2026-02-30", "2026-99-99", "abc"]) assert.equal(companyEditableSchema.safeParse({ ...emptyCompany, name: "Test", sources: [{ id: "s", label: "Source", url: "https://example.com", consultedOn }] }).success, false);
  assert.equal(companyEditableSchema.safeParse({ ...emptyCompany, name: "Test", email: "pas un email" }).success, false);
  assert.equal(companyEditableSchema.safeParse({ ...emptyCompany, name: "Test", sources: [{ id: "s", label: "Source", url: "https://example.com", consultedOn: "2024-02-29" }] }).success, true);
});
test("stockage : structure corrompue ou identifiants dupliqués rejetés, ancien lien dangereux non activé", () => {
  assert.throws(() => parsePilotState({ ...legacy, companies: [{ id: "incomplet" }] }));
  assert.throws(() => parsePilotState({ ...legacy, companies: [...legacy.companies, ...legacy.companies] }));
  const state = parsePilotState({ ...legacy, companies: [{ ...legacy.companies[0], source: "javascript:alert(1)" }] });
  assert.equal(state.companies[0].sources.length, 0);
});
