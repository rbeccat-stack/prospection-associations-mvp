import { z } from "zod";

export const COMPANY_DIRECTORY = "https://recherche-entreprises.api.gouv.fr/search";
export const territories = { lyon: "Lyon (9 arrondissements)", rhone: "Rhône (69)", france: "France" } as const;
export const sizes = { any: "Tous, y compris inconnus", small: "1 à 9 salariés", medium: "10 à 49 salariés", large: "50 à 249 salariés" } as const;
export const sectors = { all: "Tous les secteurs", J: "Information et communication", M: "Conseil, sciences et techniques", C: "Industrie manufacturière", F: "Construction", G: "Commerce", N: "Services administratifs et de soutien", I: "Hébergement et restauration", H: "Transport et entreposage" } as const;
export const searchSchema = z.object({
  q: z.string().trim().max(120).default(""),
  territory: z.enum(["lyon", "rhone", "france"]).default("lyon"),
  size: z.enum(["any", "small", "medium", "large"]).default("any"),
  sector: z.enum(["all", "J", "M", "C", "F", "G", "N", "I", "H"]).default("all"),
  page: z.coerce.number().int().min(1).max(100).default(1),
}).strict();
export type CompanySearch = z.infer<typeof searchSchema>;
const placeSchema = z.object({ adresse: z.string().nullish(), code_postal: z.string().nullish(), libelle_commune: z.string().nullish(), siret: z.string().nullish(), etat_administratif: z.string().nullish() });
const companySchema = z.object({
  siren: z.string().regex(/^\d{9}$/), nom_complet: z.string().min(1), nature_juridique: z.string().nullish(),
  etat_administratif: z.string().nullish(), activite_principale: z.string().nullish(), date_creation: z.string().nullish(),
  tranche_effectif_salarie: z.string().nullish(), annee_tranche_effectif_salarie: z.string().nullish(),
  siege: placeSchema.nullish(), matching_etablissements: z.array(placeSchema).nullish(),
  complements: z.object({ est_association: z.boolean().nullish(), est_administration: z.boolean().nullish() }).nullish(),
});
const responseSchema = z.object({ results: z.array(companySchema), page: z.number().int().positive(), total_pages: z.number().int().nonnegative(), total_results: z.number().int().nonnegative() });
export type DirectoryCompany = {
  siren: string; name: string; activityCode: string | null; createdAt: string | null;
  workforce: string; workforceYear: string | null; headOffice: string | null;
  localAddress: string | null; localSiret: string | null; officialUrl: string; consultedAt: string;
};
export type CompanySearchResult = { companies: DirectoryCompany[]; page: number; totalPages: number; totalResults: number; omitted: number; directLookup: boolean; sourceUrl: string; consultedAt: string };
const workforceLabels: Record<string,string> = { NN: "Effectif inconnu", "00": "0 salarié (pendant l’année de référence)", "01": "1 à 2 salariés", "02": "3 à 5 salariés", "03": "6 à 9 salariés", "11": "10 à 19 salariés", "12": "20 à 49 salariés", "21": "50 à 99 salariés", "22": "100 à 199 salariés", "31": "200 à 249 salariés", "32": "250 à 499 salariés", "41": "500 à 999 salariés", "42": "1 000 à 1 999 salariés", "51": "2 000 à 4 999 salariés", "52": "5 000 à 9 999 salariés", "53": "10 000 salariés ou plus" };
export const isDirectLookup = (q:string) => /^(\d{9}|\d{14})$/.test(q);
export function companySearchUrl(raw: CompanySearch) {
  const input=searchSchema.parse(raw); const url=new URL(COMPANY_DIRECTORY);
  if(input.q) url.searchParams.set("q",input.q);
  url.searchParams.set("page",String(input.page)); url.searchParams.set("per_page","10");
  url.searchParams.set("minimal","true"); url.searchParams.set("include","siege,matching_etablissements,complements");
  if(!isDirectLookup(input.q)) {
    url.searchParams.set("etat_administratif","A"); url.searchParams.set("est_association","false"); url.searchParams.set("est_administration","false");
    if(input.territory==="lyon") url.searchParams.set("code_postal",Array.from({length:9},(_,i)=>`6900${i+1}`).join(","));
    if(input.territory==="rhone") url.searchParams.set("departement","69");
    if(input.sector!=="all") url.searchParams.set("section_activite_principale",input.sector);
    if(input.size!=="any") url.searchParams.set("tranche_effectif_salarie",{small:"01,02,03",medium:"11,12",large:"21,22,31"}[input.size]);
  }
  return url.toString();
}
export class CompanySearchError extends Error {
  constructor(public status:number, message:string, public retryAfter?:string) { super(message); }
}
export async function searchCompanies(raw: CompanySearch, fetcher:typeof fetch=fetch):Promise<CompanySearchResult> {
  const input=searchSchema.parse(raw); const url=companySearchUrl(input);
  let response:Response;
  try { response=await fetcher(url,{headers:{Accept:"application/json","User-Agent":"SwipeAndProspect/0.1 (manual company search)"},signal:AbortSignal.timeout(12000),cache:"no-store",redirect:"error"}); }
  catch { throw new CompanySearchError(502,"Impossible de joindre l’Annuaire des entreprises. Réessayez dans quelques instants."); }
  if(!response.ok) {
    if(response.status===429) { const retry=response.headers.get("retry-after"); throw new CompanySearchError(429,"L’Annuaire limite temporairement les recherches. Patientez avant de réessayer.",retry && /^\d{1,5}$/.test(retry)?retry:undefined); }
    throw new CompanySearchError(502,`L’Annuaire ne peut pas répondre à cette recherche (HTTP ${response.status}).`);
  }
  let payload:z.infer<typeof responseSchema>;
  try { payload=responseSchema.parse(await response.json()); }
  catch { throw new CompanySearchError(502,"La réponse de l’Annuaire est illisible ou incomplète. Aucun résultat n’a été importé."); }
  const directLookup=isDirectLookup(input.q); const seen=new Set<string>(); const consultedAt=new Date().toISOString();
  const companies:DirectoryCompany[]=[];
  for(const c of payload.results) {
    // Only active businesses; unknown legal categories stay out rather than being guessed.
    if(c.etat_administratif!=="A" || !/^[1-6]\d{3}$/.test(c.nature_juridique||"") || c.nature_juridique==="5195" || c.complements?.est_association || c.complements?.est_administration || seen.has(c.siren)) continue;
    seen.add(c.siren);
    const matches=(p:z.infer<typeof placeSchema>)=>p.etat_administratif==="A" && (input.territory==="lyon"?/^6900[1-9]$/.test(p.code_postal||""):input.territory==="rhone"?/^69\d{3}$/.test(p.code_postal||""):true);
    const local=directLookup || input.territory==="france"?null:c.matching_etablissements?.find(matches) || (c.siege && matches(c.siege)?c.siege:null);
    companies.push({siren:c.siren,name:c.nom_complet,activityCode:c.activite_principale||null,createdAt:c.date_creation||null,
      workforce:workforceLabels[c.tranche_effectif_salarie||"NN"]||"Effectif non interprété",workforceYear:c.annee_tranche_effectif_salarie||null,
      headOffice:c.siege?.adresse||null,localAddress:local?.adresse||null,localSiret:local?.siret||null,
      officialUrl:`https://annuaire-entreprises.data.gouv.fr/entreprise/${c.siren}`,consultedAt});
  }
  return {companies,page:payload.page,totalPages:Math.min(payload.total_pages,100),totalResults:payload.total_results,omitted:payload.results.length-companies.length,directLookup,sourceUrl:url,consultedAt};
}
