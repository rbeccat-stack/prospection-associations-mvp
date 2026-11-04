import test from "node:test";
import assert from "node:assert/strict";
import { enrichCompany, extractCompanyPage } from "../src/lib/company-enrichment";
import { canAcceptEnrichment, enrichmentInputSchema } from "../src/lib/company-enrichment-shared";
import { emptyCompany, parsePilotState, saveCompanyEnrichment, importDirectoryCompany } from "../src/lib/company-records";
import { enrichmentExamples } from "../src/lib/company-pilot-examples";
import { POST } from "../src/app/api/companies/enrich/route";
import { publicTarget } from "../src/lib/collector";

const now = "2026-11-04T12:00:00.000Z";
const html = (body: string, head = "") => `<html><head><title>Entreprise test</title>${head}</head><body><nav>Menu</nav><main><p>${body}</p><p>Présentation publique et volontairement fictive, suffisamment longue pour vérifier la lecture de cette page de démonstration.</p></main></body></html>`;
const mock = async (url: string) => ({ html: html("SIRET : 901 931 105 00018"), url });

test("sources : 3 pages maximum, même domaine, aucun protocole ou identifiant dangereux", () => {
  assert.equal(enrichmentInputSchema.safeParse({ website: "https://example.com/", pages: ["https://www.example.com/legal"] }).success, true);
  for (const website of ["javascript:alert(1)", "https://user:secret@example.com/", "file:///a", "https://example.com:8080/"]) assert.equal(enrichmentInputSchema.safeParse({ website }).success, false);
  assert.equal(enrichmentInputSchema.safeParse({ website: "https://example.com", pages: ["https://example.com.evil.test"] }).success, false);
  assert.equal(enrichmentInputSchema.safeParse({ website: "https://example.com", pages: ["https://example.com/1", "https://example.com/2", "https://example.com/3"] }).success, false);
});

test("réseau : adresses privées et de boucle locale bloquées avant connexion", async () => {
  for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/"]) await assert.rejects(publicTarget(url), /locales ou privées/);
});

test("extraction : métadonnées, SIRET espacé, date publiée distincte et aucun script", () => {
  const page = extractCompanyPage(html("SIRET : 901 931 105 00018", '<meta name="description" content="Présentation de démonstration"><meta property="article:published_time" content="2026-10-12T12:00:00Z"><script>secret invisible</script>'), "https://example.com/", now);
  assert.equal(page.excerpt, "Présentation de démonstration"); assert.equal(page.publishedOn, "2026-10-12");
  assert.deepEqual(page.sirens, ["901931105"]); assert.equal(page.consultedAt, now);
  const future = extractCompanyPage(html("Téléphone 04 12 34 56 78", '<meta property="article:published_time" content="2099-10-12">'), "https://example.com", now);
  assert.equal(future.publishedOn, undefined); assert.deepEqual(future.sirens, []); assert.ok(!future.excerpt.includes("Menu"));
  const legal = extractCompanyPage(html("Registre du Commerce et des Sociétés de Lyon sous le numéro 304 453 160"), "https://example.com", now);
  assert.deepEqual(legal.sirens, ["304453160"]);
});

test("collecte : SIREN rapproché, doublons URL supprimés, erreurs partielles visibles", async () => {
  const calls: string[] = [];
  const result = await enrichCompany({ siren: "901931105", website: "https://example.com/", pages: ["https://example.com/#top", "https://example.com/legal"] }, async url => {
    calls.push(url); if (url.endsWith("legal")) throw Object.assign(new Error("raw private detail"), { code: "ECONNREFUSED" }); return mock(url);
  }, now);
  assert.equal(calls.length, 2); assert.equal(result.identity, "matched"); assert.equal(result.pages[1].status, "unavailable");
  assert.equal(canAcceptEnrichment(result), true); assert.ok(!JSON.stringify(result).includes("private detail"));
});

test("identité : conflit bloquant, absence explicite, aucun extrait inventé si indisponible", async () => {
  const conflict = await enrichCompany({ siren: "111111111", website: "https://example.com" }, mock, now);
  assert.equal(conflict.identity, "conflict"); assert.equal(canAcceptEnrichment(conflict), false);
  const mixed = await enrichCompany({ siren: "901931105", website: "https://example.com" }, async url => ({ url, html: html("SIREN : 901931105. SIREN : 111111111.") }), now);
  assert.equal(mixed.identity, "conflict");
  const redirect = await enrichCompany({ website: "https://example.com" }, async () => ({ url: "https://other.example", html: html("Autre domaine") }), now);
  assert.equal(canAcceptEnrichment(redirect), false); assert.match(redirect.pages[0].error!, /autre site/);
  const missing = await enrichCompany({ siren: "901931105", website: "https://example.com" }, async url => ({ url, html: html("Une entreprise sans identifiant publié") }), now);
  assert.equal(missing.identity, "unconfirmed");
  const unavailable = await enrichCompany({ website: "https://example.com" }, async () => { throw new Error("raw server detail"); }, now);
  assert.equal(canAcceptEnrichment(unavailable), false); assert.equal(unavailable.pages[0].excerpt, "");
  assert.ok(!JSON.stringify(unavailable).includes("raw server detail"));
});

test("enregistrement : notes, brouillon, sources et Sirene conservés après rechargement/actualisation", async () => {
  const company = { ...emptyCompany, id: "test", siren: "901931105", name: "Nom personnel", source: "", notes: "Mes notes", idea: "Mon idée", signal: "Mon observation" };
  const result = await enrichCompany({ siren: company.siren, website: "https://example.com" }, mock, now);
  const saved = saveCompanyEnrichment(company, result);
  const state = parsePilotState({ companies: [saved], choices: { test: "keep" }, decisions: { test: "prospect" }, subjects: { test: "Objet" }, messages: { test: "Mon brouillon" } });
  assert.deepEqual(parsePilotState(JSON.parse(JSON.stringify(state))), state);
  const refreshed = importDirectoryCompany(state, { siren: "901931105", name: "Nom officiel", activityCode: null, createdAt: null, workforce: "Inconnu", workforceYear: null, headOffice: null, localAddress: null, localSiret: null, officialUrl: "https://example.com", consultedAt: now });
  assert.deepEqual(refreshed.companies[0].enrichment, saved.enrichment); assert.equal(refreshed.companies[0].notes, company.notes);
  assert.deepEqual(refreshed.messages, state.messages); assert.equal(saved.signal, company.signal); assert.equal(saved.idea, company.idea);
  assert.throws(() => saveCompanyEnrichment({ ...company, siren: "111111111" }, result), /SIREN/);
  assert.throws(() => saveCompanyEnrichment(company, { ...result, identity: "conflict" }), /identité/);
});

test("route : origine tierce, JSON invalide et domaines différents refusés sans collecte", async () => {
  const headers = { "content-type": "application/json" };
  const foreign = await POST(new Request("https://app.example/api/companies/enrich", { method: "POST", headers: { ...headers, origin: "https://other.example" }, body: "{}" })); assert.equal(foreign.status, 403);
  const invalid = await POST(new Request("https://app.example/api/companies/enrich", { method: "POST", headers, body: "{" })); assert.equal(invalid.status, 400);
  const different = await POST(new Request("https://app.example/api/companies/enrich", { method: "POST", headers, body: JSON.stringify({ website: "https://example.com", pages: ["https://other.example"] }) })); assert.equal(different.status, 400);
  assert.equal(different.headers.get("cache-control"), "private, no-store");
});

test("trois pilotes : fiches valides, secteurs distincts, sources datées et hypothèses signalées", () => {
  const state = parsePilotState({ companies: enrichmentExamples, choices: {}, decisions: {}, subjects: {}, messages: {} });
  assert.equal(new Set(state.companies.map(c => c.siren)).size, 3);
  for (const c of state.companies) { assert.ok(c.sources.every(s => s.consultedOn === "2026-11-04")); assert.match(c.idea, /^Hypothèse/); assert.equal(c.email, ""); }
});
