import test from "node:test";
import assert from "node:assert/strict";
import { searchSchema, companySearchUrl, searchCompanies, CompanySearchError } from "../src/lib/company-search";
import { GET } from "../src/app/api/companies/search/route";
const input=searchSchema.parse({});
const record={siren:"901931105",siret:"90193110500018",statutDiffusionEtablissement:"O",etablissementSiege:true,uniteLegale:{etatAdministratifUniteLegale:"A",statutDiffusionUniteLegale:"O",categorieJuridiqueUniteLegale:"5710",denominationUniteLegale:"MUODIM",activitePrincipaleUniteLegale:"62.01Z",dateCreationUniteLegale:"2021-07-29",trancheEffectifsUniteLegale:"02",anneeEffectifsUniteLegale:"2022"},adresseEtablissement:{numeroVoieEtablissement:"31",typeVoieEtablissement:"RUE",libelleVoieEtablissement:"SAINT MAXIMIN",codePostalEtablissement:"69003",libelleCommuneEtablissement:"LYON"},periodesEtablissement:[{etatAdministratifEtablissement:"A",dateFin:null}]};
const payload=(etablissements:unknown[])=>({header:{total:15,debut:0,nombre:10},etablissements});
const fake=(records:unknown[])=> (async()=>Response.json(payload(records))) as typeof fetch;
process.env.API_KEY_SIRENE="synthetic-test-key";
test("Sirene : filtres géographiques, activité et effectif dans une requête sécurisée",()=>{
 const url=new URL(companySearchUrl({...input,territory:"rhone",size:"medium",sector:"J",page:2}));assert.equal(url.origin,"https://api.insee.fr");assert.equal(url.pathname,"/api-sirene/3.11/siret");assert.match(url.searchParams.get("q")!,/codePostalEtablissement:69\*/);assert.match(url.searchParams.get("q")!,/trancheEffectifsUniteLegale:11/);assert.match(url.searchParams.get("q")!,/activitePrincipaleUniteLegale:62\*/);assert.equal(url.searchParams.get("debut"),"10");assert.ok(url.searchParams.get("date"));assert.ok(!url.toString().includes("synthetic-test-key"));
});
test("Sirene : recherche directe identifiant sans filtre de territoire",()=>{for(const q of ["901931105","90193110500018"]){const url=new URL(companySearchUrl({...input,q,size:"large"}));assert.equal(url.searchParams.get("q"),`${q.length===9?"siren":"siret"}:${q}`);}});
test("Sirene : entrée textuelle échappée et paramètres rejetés",()=>{const url=new URL(companySearchUrl({...input,q:'muodim" OR siren:*'}));assert.ok(!url.searchParams.get('q')!.includes('muodim" OR'));for(const bad of [{page:0},{page:101},{sector:"X"},{q:"a".repeat(121)},{url:"http://localhost"}])assert.equal(searchSchema.safeParse(bad).success,false);});
test("Sirene : clé privée uniquement dans l’en-tête et conversion établissement",async()=>{let called=false;const f=(async(u,opts)=>{called=true;assert.equal(new URL(String(u)).hostname,"api.insee.fr");const h=new Headers(opts?.headers);assert.equal(h.get("X-INSEE-Api-Key-Integration"),"synthetic-test-key");assert.ok(!String(u).includes("synthetic-test-key"));return Response.json(payload([record]));}) as typeof fetch;const result=await searchCompanies(input,f);assert.equal(called,true);assert.equal(result.companies[0].name,"MUODIM");assert.equal(result.companies[0].localSiret,"90193110500018");assert.equal(result.companies[0].headOffice,"31 RUE SAINT MAXIMIN 69003 LYON");assert.equal(result.companies[0].workforceYear,"2022");assert.equal(result.totalResults,15);});
test("Sirene : dédoublonnage, exclusion entreprises fermées et associations",async()=>{const result=await searchCompanies(input,fake([record,record,{...record,siren:"123456789",siret:"12345678900000",uniteLegale:{...record.uniteLegale,categorieJuridiqueUniteLegale:"9220"}},{...record,siren:"222222222",siret:"22222222200000",periodesEtablissement:[{dateFin:null,etatAdministratifEtablissement:"F"}]}]));assert.equal(result.companies.length,1);assert.equal(result.omitted,3);});
test("Sirene : diffusion partielle ne rend pas une adresse confidentielle",async()=>{const r=await searchCompanies(input,fake([{...record,statutDiffusionEtablissement:"P",etablissementSiege:false}]));assert.equal(r.companies[0].localAddress,"69003 LYON");assert.equal(r.companies[0].headOffice,null);});
test("Sirene : erreur de clé, quota, réseau et JSON affichés sans fuite",async()=>{const f=(status:number)=>(async()=>new Response("secret",{status,headers:{"retry-after":"30"}})) as typeof fetch;await assert.rejects(searchCompanies(input,f(403)),(e:unknown)=>e instanceof CompanySearchError&&e.status===503&&!e.message.includes("secret"));await assert.rejects(searchCompanies(input,f(429)),(e:unknown)=>e instanceof CompanySearchError&&e.status===429&&e.retryAfter==="30");await assert.rejects(searchCompanies(input,(async()=>{throw new Error("network")}) as typeof fetch));await assert.rejects(searchCompanies(input,f(200)));const empty=await searchCompanies(input,f(404));assert.equal(empty.totalResults,0);});
test("Sirene : clé absente bloque l’appel et nomme la variable",async()=>{const saved=process.env.API_KEY_SIRENE;delete process.env.API_KEY_SIRENE;let called=false;try{await assert.rejects(searchCompanies(input,(async()=>{called=true;return new Response()}) as typeof fetch),/API_KEY_SIRENE/);assert.equal(called,false);}finally{process.env.API_KEY_SIRENE=saved;}});
test("route Sirene : paramètres invalides et résultat simulé sans cache",async()=>{const old=globalThis.fetch;globalThis.fetch=(async()=>Response.json(payload([record]))) as typeof fetch;try{assert.equal((await GET(new Request("http://localhost/api/companies/search?page=0"))).status,400);const good=await GET(new Request("http://localhost/api/companies/search?q=Muodim"));assert.equal(good.status,200);assert.equal((await good.json()).companies[0].siren,"901931105");assert.equal(good.headers.get("cache-control"),"private, no-store");}finally{globalThis.fetch=old;}});

test("Sirene siret : champs entreprise courants et état établissement historisé",()=>{
 const q=new URL(companySearchUrl({...input,territory:"rhone",size:"medium",sector:"F"})).searchParams.get("q")!;
 assert.ok(q.includes("etatAdministratifUniteLegale:A"));
 assert.ok(!q.includes("periode(etatAdministratifUniteLegale:"));
 assert.match(q,/periode\(etatAdministratifEtablissement:A\)/);
 for(const n of ["41","42","43"]) assert.ok(q.includes(`activitePrincipaleUniteLegale:${n}*`));
 assert.ok(!q.includes("periode(activitePrincipaleUniteLegale:"));
 assert.ok(q.includes("codePostalEtablissement:69*"));
 assert.ok(q.includes("trancheEffectifsUniteLegale:11"));
 const name=new URL(companySearchUrl({...input,q:"MUODIM"})).searchParams.get("q")!;
 assert.ok(name.includes('denominationUniteLegale:"MUODIM"'));
 assert.ok(!name.includes('periode(denominationUniteLegale:'));
});

test("Sirene : détail JSON de l’erreur 400 visible sans divulguer la clé",async()=>{
 const key=process.env.API_KEY_SIRENE!;
 const f=(async()=>Response.json({header:{statut:400,message:`Champ inconnu et clé ${key}`}},{status:400})) as typeof fetch;
 await assert.rejects(searchCompanies(input,f),(e:unknown)=>e instanceof CompanySearchError&&e.message.includes("Champ inconnu")&&!e.message.includes(key));
});
test("Sirene : corps HTML ou détails trop volumineux non affichés",async()=>{
 for(const r of [new Response("<html>secret</html>",{status:400,headers:{"content-type":"text/html"}}),Response.json({header:{message:"x".repeat(9000)}},{status:400})]){
  await assert.rejects(searchCompanies(input,(async()=>r) as typeof fetch),(e:unknown)=>e instanceof CompanySearchError&&e.message.includes("Aucun détail exploitable")&&!e.message.includes("secret"));
 }
});
