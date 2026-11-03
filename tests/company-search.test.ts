import test from "node:test";
import assert from "node:assert/strict";
import { searchSchema, companySearchUrl, searchCompanies, CompanySearchError } from "../src/lib/company-search";
import { GET } from "../src/app/api/companies/search/route";
const input=searchSchema.parse({});
const company={siren:"901931105",nom_complet:"MUODIM",nature_juridique:"5710",etat_administratif:"A",activite_principale:"62.01Z",tranche_effectif_salarie:"02",annee_tranche_effectif_salarie:"2022",siege:{adresse:"PARIS",code_postal:"75001",etat_administratif:"A"},matching_etablissements:[{adresse:"ANCIEN LYON",code_postal:"69003",etat_administratif:"F"},{adresse:"31 RUE SAINT MAXIMIN 69003 LYON",code_postal:"69003",siret:"90193110500018",etat_administratif:"A"}]};
const payload=(results:unknown[])=>({results,page:1,total_pages:2,total_results:15});
const response=(results:unknown[]) => (async()=>Response.json(payload(results))) as typeof fetch;

test("entreprises : filtres serveur, périmètre local et effectif sans exclure les inconnus par défaut",()=>{
  const u=new URL(companySearchUrl(input));
  assert.equal(u.hostname,"recherche-entreprises.api.gouv.fr");assert.equal(u.searchParams.get("est_association"),"false");assert.equal(u.searchParams.get("est_administration"),"false");
  assert.equal(u.searchParams.get("etat_administratif"),"A");assert.equal(u.searchParams.get("code_postal")?.split(",").length,9);assert.equal(u.searchParams.get("tranche_effectif_salarie"),null);
  const filtered=new URL(companySearchUrl({...input,territory:"rhone",size:"medium",sector:"M",page:2}));
  assert.equal(filtered.searchParams.get("departement"),"69");assert.equal(filtered.searchParams.get("code_postal"),null);assert.equal(filtered.searchParams.get("tranche_effectif_salarie"),"11,12");assert.equal(filtered.searchParams.get("section_activite_principale"),"M");assert.equal(filtered.searchParams.get("page"),"2");
});
test("entreprises : SIREN et SIRET ignorent explicitement les filtres",()=>{
  for(const q of ["901931105","90193110500018"]){const u=new URL(companySearchUrl({...input,q,size:"large"}));assert.equal(u.searchParams.get("q"),q);assert.equal(u.searchParams.get("code_postal"),null);assert.equal(u.searchParams.get("tranche_effectif_salarie"),null);}
});
test("entreprises : valeurs invalides et clés externes refusées avant tout réseau",()=>{
  for(const bad of [{page:0},{page:101},{page:1.5},{territory:"elsewhere"},{size:"bogus"},{q:"a".repeat(121)},{url:"http://localhost"}])assert.equal(searchSchema.safeParse(bad).success,false);
});
test("entreprises : siège distinct du site local actif, effectif daté et provenance",async()=>{
  const r=await searchCompanies(input,response([company]));const c=r.companies[0];assert.equal(c.headOffice,"PARIS");assert.equal(c.localAddress,"31 RUE SAINT MAXIMIN 69003 LYON");assert.equal(c.workforce,"3 à 5 salariés");assert.equal(c.workforceYear,"2022");assert.ok(c.consultedAt);assert.ok(c.officialUrl.endsWith("901931105"));
  const direct=await searchCompanies({...input,q:"901931105"},response([company]));assert.equal(direct.directLookup,true);assert.equal(direct.companies[0].localAddress,null);
});
test("entreprises : associations, administrations, cessées, catégorie inconnue et doublons écartés",async()=>{
  const r=await searchCompanies(input,response([company,company,{...company,siren:"111111111",nature_juridique:"9220"},{...company,siren:"222222222",etat_administratif:"C"},{...company,siren:"333333333",nature_juridique:null},{...company,siren:"444444444",complements:{est_administration:true}},{...company,siren:"555555555",nature_juridique:"5195"}]));assert.equal(r.companies.length,1);assert.equal(r.omitted,6);
});
test("entreprises : effectifs et implantation inconnus restent explicites",async()=>{
  const r=await searchCompanies(input,response([{...company,tranche_effectif_salarie:"NN",annee_tranche_effectif_salarie:null,matching_etablissements:[]}]));assert.equal(r.companies[0].workforce,"Effectif inconnu");assert.equal(r.companies[0].workforceYear,null);assert.equal(r.companies[0].localAddress,null);
});
test("entreprises : aucun résultat de secours si réseau, JSON ou contrat échoue",async()=>{
  for(const fetcher of [(async()=>{throw new Error("EACCES");}) as typeof fetch,(async()=>new Response("<html>error</html>")) as typeof fetch,response([{...company,siren:"bad"}])])await assert.rejects(searchCompanies(input,fetcher),(e:unknown)=>e instanceof CompanySearchError&&e.status===502);
  const empty=await searchCompanies(input,response([]));assert.equal(empty.companies.length,0);
});
test("entreprises : limite du fournisseur et Retry-After préservés",async()=>{
  await assert.rejects(searchCompanies(input,(async()=>new Response("",{status:429,headers:{"Retry-After":"60"}})) as typeof fetch),(e:unknown)=>e instanceof CompanySearchError&&e.status===429&&e.retryAfter==="60");
});
test("route entreprises : validation, réponse réelle du service simulé et absence de cache public",async()=>{
  const old=globalThis.fetch;let calls=0;
  globalThis.fetch=(async(url)=>{calls++;assert.equal(new URL(String(url)).hostname,"recherche-entreprises.api.gouv.fr");return Response.json(payload([company]));}) as typeof fetch;
  try{
    const bad=await GET(new Request("http://localhost/api/companies/search?page=0"));assert.equal(bad.status,400);assert.equal(calls,0);
    const repeated=await GET(new Request("http://localhost/api/companies/search?q=a&q=b"));assert.equal(repeated.status,400);
    const good=await GET(new Request("http://localhost/api/companies/search?q=Muodim"));assert.equal(good.status,200);assert.equal((await good.json()).companies[0].siren,"901931105");assert.equal(good.headers.get("cache-control"),"private, no-store");
    globalThis.fetch=(async()=>new Response("",{status:429,headers:{"Retry-After":"30"}})) as typeof fetch;const limited=await GET(new Request("http://localhost/api/companies/search"));assert.equal(limited.status,429);assert.equal(limited.headers.get("retry-after"),"30");
  } finally {globalThis.fetch=old;}
});
