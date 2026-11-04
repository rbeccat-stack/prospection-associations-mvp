import { z } from "zod";
import { searchSchema, isDirectLookup, type CompanySearch, type CompanySearchResult, type DirectoryCompany } from "./company-search-shared";
export { searchSchema, isDirectLookup } from "./company-search-shared";
export type { CompanySearch, CompanySearchResult, DirectoryCompany } from "./company-search-shared";

export const COMPANY_DIRECTORY = "https://api.insee.fr/api-sirene/3.11/siret";
const workforceLabels: Record<string,string> = { NN:"Effectif inconnu", "00":"0 salarié (année de référence)", "01":"1 à 2 salariés", "02":"3 à 5 salariés", "03":"6 à 9 salariés", "11":"10 à 19 salariés", "12":"20 à 49 salariés", "21":"50 à 99 salariés", "22":"100 à 199 salariés", "31":"200 à 249 salariés", "32":"250 à 499 salariés", "41":"500 à 999 salariés", "42":"1 000 à 1 999 salariés", "51":"2 000 à 4 999 salariés", "52":"5 000 à 9 999 salariés", "53":"10 000 salariés ou plus" };
const sectorDivisions:Record<string,string[]>={J:["58","59","60","61","62","63"],M:["69","70","71","72","73","74","75"],C:Array.from({length:24},(_,i)=>String(i+10)),F:["41","42","43"],G:["45","46","47"],N:["77","78","79","80","81","82"],I:["55","56"],H:["49","50","51","52","53"]};
const sizes:Record<string,string[]>={small:["01","02","03"],medium:["11","12"],large:["21","22","31"]};
const field=(key:string,values:string[])=>`(${values.map(v=>`${key}:${v}`).join(" OR ")})`;
export function companySearchUrl(raw:CompanySearch) {
  const input=searchSchema.parse(raw), clauses:string[]=[];
  if(isDirectLookup(input.q)) clauses.push(`${input.q.length===9?"siren":"siret"}:${input.q}`);
  else {
    clauses.push("etatAdministratifUniteLegale:A", "periode(etatAdministratifEtablissement:A)");
    if(input.territory==="lyon") clauses.push(field("codePostalEtablissement",Array.from({length:9},(_,i)=>`6900${i+1}`)));
    if(input.territory==="rhone") clauses.push("codePostalEtablissement:69*");
    if(input.sector!=="all") clauses.push(field("activitePrincipaleUniteLegale",sectorDivisions[input.sector].map(v=>`${v}*`)));
    if(input.size!=="any") clauses.push(field("trancheEffectifsUniteLegale",sizes[input.size]));
    if(input.q) {
      const safe=input.q.replace(/[\\"\u0000-\u001f]/g," ").trim();
      if(!safe) throw new CompanySearchError(400,"Saisissez un nom d’entreprise valide.");
      clauses.push(`denominationUniteLegale:"${safe}"`);
    }
  }
  const url=new URL(COMPANY_DIRECTORY);url.searchParams.set("q",clauses.join(" AND "));url.searchParams.set("nombre","10");url.searchParams.set("debut",String((input.page-1)*10));url.searchParams.set("date",new Date().toISOString().slice(0,10));url.searchParams.set("tri","true");
  return url.toString();
}
export class CompanySearchError extends Error { constructor(public status:number,message:string,public retryAfter?:string){super(message);} }

// Sirene returns useful parser details in header.message on HTTP 400. Limit the
// read, accept only JSON text, and remove the configured credential before
// showing it in this private app. Never expose raw headers, requests or HTML.
async function queryErrorDetail(response:Response, apiKey:string):Promise<string|null> {
  if(apiKey.length<4 || !response.headers.get("content-type")?.toLowerCase().includes("application/json") || !response.body)return null;
  try {
    const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return null;}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    const parsed=JSON.parse(new TextDecoder().decode(bytes));
    const message=parsed?.header?.message;
    if(typeof message!=="string")return null;
    let clean=message.replaceAll(apiKey,"[masqué]").replaceAll(encodeURIComponent(apiKey),"[masqué]");
    clean=clean.replace(/(?:authorization|x-insee-api-key-integration|api[_ -]?key|bearer)\s*[:=]?\s*[^\s,;]+/gi,"[identifiant masqué]").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
    if(!clean || clean.toLowerCase()==="bad request")return null;
    return clean.slice(0,400);
  } catch {return null;}
}
const text=z.string().nullish();
const unit=z.object({etatAdministratifUniteLegale:text,statutDiffusionUniteLegale:text,categorieJuridiqueUniteLegale:text,identifiantAssociationUniteLegale:text,denominationUniteLegale:text,nomUniteLegale:text,prenomUsuelUniteLegale:text,prenom1UniteLegale:text,activitePrincipaleUniteLegale:text,dateCreationUniteLegale:text,trancheEffectifsUniteLegale:text,anneeEffectifsUniteLegale:text});
const address=z.object({numeroVoieEtablissement:text,indiceRepetitionEtablissement:text,typeVoieEtablissement:text,libelleVoieEtablissement:text,codePostalEtablissement:text,libelleCommuneEtablissement:text});
const establishment=z.object({siren:z.string().regex(/^\d{9}$/),siret:z.string().regex(/^\d{14}$/),statutDiffusionEtablissement:text,etablissementSiege:z.boolean().nullish(),uniteLegale:unit,adresseEtablissement:address.nullish(),periodesEtablissement:z.array(z.object({etatAdministratifEtablissement:text,dateFin:text})).optional()});
const responseSchema=z.object({header:z.object({total:z.number().int().nonnegative(),debut:z.number().int().nonnegative(),nombre:z.number().int().nonnegative()}),etablissements:z.array(establishment)});
const attempts:number[]=[];
function reserveSlot(){const now=Date.now();while(attempts.length&&attempts[0]<=now-60000)attempts.shift();if(attempts.length>=25)throw new CompanySearchError(429,"Limite locale de recherche atteinte. Réessayez dans quelques instants.",String(Math.max(1,Math.ceil((attempts[0]+60000-now)/1000))));attempts.push(now);}
export async function searchCompanies(raw:CompanySearch,fetcher:typeof fetch=fetch):Promise<CompanySearchResult> {
  const input=searchSchema.parse(raw);const url=companySearchUrl(input);const apiKey=process.env.API_KEY_SIRENE?.trim();
  if(!apiKey)throw new CompanySearchError(503,"La clé API Sirene n’est pas configurée. Ajoutez API_KEY_SIRENE aux variables d’environnement du serveur.");
  if(fetcher===fetch)reserveSlot();
  let response:Response;
  try {response=await fetcher(url,{headers:{Accept:"application/json","X-INSEE-Api-Key-Integration":apiKey,"User-Agent":"SwipeAndProspect/0.1"},signal:AbortSignal.timeout(12000),cache:"no-store",redirect:"error"});}
  catch{throw new CompanySearchError(502,"Impossible de joindre l’API Sirene. Réessayez dans quelques instants.");}
  if(response.status===429){const retry=response.headers.get("retry-after");throw new CompanySearchError(429,"L’Insee limite temporairement les recherches. Patientez avant de réessayer.",retry&&/^\d{1,5}$/.test(retry)?retry:"60");}
  if(response.status===401||response.status===403)throw new CompanySearchError(503,"L’Insee refuse l’accès. Vérifiez la clé API et la souscription à l’API Sirene.");
  if(response.status===404){return {companies:[],page:input.page,totalPages:0,totalResults:0,omitted:0,directLookup:isDirectLookup(input.q),sourceUrl:COMPANY_DIRECTORY,consultedAt:new Date().toISOString()};}
  if(response.status===400){const detail=await queryErrorDetail(response,apiKey);throw new CompanySearchError(502,`L’Insee a rejeté cette recherche (HTTP 400).${detail?` Détail : ${detail}`:" Aucun détail exploitable communiqué."}`);}
  if(!response.ok)throw new CompanySearchError(502,`L’API Sirene ne peut pas répondre à cette recherche (HTTP ${response.status}).`);
  let payload:z.infer<typeof responseSchema>;try{payload=responseSchema.parse(await response.json());}catch{throw new CompanySearchError(502,"La réponse de l’API Sirene est illisible ou incomplète.");}
  const seen=new Set<string>(),companies:DirectoryCompany[]=[],consultedAt=new Date().toISOString(),directLookup=isDirectLookup(input.q);
  const omittedReasons={duplicates:0,ineligible:0,filters:0,identity:0};
  const clean=(s:string|null|undefined)=>s&&s.trim()!=="[ND]"?s.trim()||null:null;
  for(const e of payload.etablissements){const u=e.uniteLegale;const period=e.periodesEtablissement?.find(p=>!p.dateFin);
    if(u.etatAdministratifUniteLegale!=="A" || period?.etatAdministratifEtablissement!=="A" || !/^[1-6]\d{3}$/.test(u.categorieJuridiqueUniteLegale||"") || u.categorieJuridiqueUniteLegale==="5195" || u.identifiantAssociationUniteLegale){omittedReasons.ineligible++;continue;}
    if(!e.siret.startsWith(e.siren)||(directLookup&&(input.q.length===9?e.siren:e.siret)!==input.q)){omittedReasons.identity++;continue;}
    const postcode=clean(e.adresseEtablissement?.codePostalEtablissement);
    if(!directLookup&&((input.territory==="lyon"&&!/^6900[1-9]$/.test(postcode||""))||(input.territory==="rhone"&&!/^69\d{3}$/.test(postcode||""))||(input.sector!=="all"&&!sectorDivisions[input.sector].includes((clean(u.activitePrincipaleUniteLegale)||"").slice(0,2)))||(input.size!=="any"&&!sizes[input.size].includes(u.trancheEffectifsUniteLegale||"")))){omittedReasons.filters++;continue;}
    if(seen.has(e.siren)){omittedReasons.duplicates++;continue;}
    const personal=u.categorieJuridiqueUniteLegale==="1000";const privateInfo=e.statutDiffusionEtablissement==="P"||u.statutDiffusionUniteLegale==="P";
    const name=clean(u.denominationUniteLegale) || (!privateInfo&&personal?[clean(u.prenomUsuelUniteLegale)||clean(u.prenom1UniteLegale),clean(u.nomUniteLegale)].filter(Boolean).join(" "):"");if(!name){omittedReasons.identity++;continue;}
    seen.add(e.siren);const a=e.adresseEtablissement;const street=privateInfo?[]:[a?.numeroVoieEtablissement,a?.indiceRepetitionEtablissement,a?.typeVoieEtablissement,a?.libelleVoieEtablissement].map(clean).filter(Boolean);const local=[...street,clean(a?.codePostalEtablissement),clean(a?.libelleCommuneEtablissement)].filter(Boolean).join(" ")||null;
    const activityCode=clean(u.activitePrincipaleUniteLegale),createdAt=clean(u.dateCreationUniteLegale),workforceYear=clean(u.anneeEffectifsUniteLegale);
    const warnings:string[]=[];
    if(privateInfo)warnings.push("Diffusion partielle : certaines informations sont masquées.");
    if(!local)warnings.push("Adresse non renseignée.");
    if(!activityCode)warnings.push("Activité APE non renseignée.");
    if(!createdAt)warnings.push("Date de création non renseignée.");
    if(!u.trancheEffectifsUniteLegale||u.trancheEffectifsUniteLegale==="NN")warnings.push("Effectif inconnu.");
    else if(!workforceLabels[u.trancheEffectifsUniteLegale])warnings.push("Tranche d’effectif non reconnue.");
    else if(!workforceYear)warnings.push("Année de référence de l’effectif non renseignée.");
    companies.push({siren:e.siren,name,activityCode,createdAt,workforce:workforceLabels[u.trancheEffectifsUniteLegale||"NN"]||"Effectif non interprété",workforceYear,headOffice:e.etablissementSiege?local:null,localAddress:local,localSiret:e.siret,officialUrl:`https://annuaire-entreprises.data.gouv.fr/entreprise/${e.siren}`,consultedAt,warnings});
  }
  return {companies,page:input.page,totalPages:Math.min(Math.ceil(payload.header.total/10),100),totalResults:payload.header.total,omitted:payload.etablissements.length-companies.length,omittedReasons,directLookup,sourceUrl:COMPANY_DIRECTORY,consultedAt};
}
