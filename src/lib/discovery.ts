import { z } from "zod";

export const DIRECTORY_URL = "https://recherche-entreprises.api.gouv.fr/search";
export const DIRECTORY_LABEL = "API Recherche d’entreprises — Annuaire des entreprises";
const lyonPostalCodes = Array.from({ length: 9 }, (_, index) => `6900${index + 1}`).join(",");

const resultSchema = z.object({
  siren: z.string().regex(/^\d{9}$/),
  nom_complet: z.string().min(1),
  activite_principale: z.string().nullish(),
  etat_administratif: z.string().nullish(),
  siege: z.object({ adresse: z.string().nullish(), code_postal: z.string().nullish() }).nullish(),
  matching_etablissements: z.array(z.object({ adresse: z.string().nullish(), code_postal: z.string().nullish() }).passthrough()).nullish(),
}).passthrough();
const responseSchema = z.object({
  results: z.array(resultSchema),
  total_results: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
  page: z.number().int().positive(),
}).passthrough();

export type DiscoveryCandidate = {
  siren: string;
  name: string;
  address: string;
  activityCode: string | null;
  officialUrl: string;
};

export type DiscoveryPage = {
  candidates: DiscoveryCandidate[];
  page: number;
  totalPages: number;
  totalResults: number;
  source: string;
};

export function discoveryUrl(page: number): string {
  if (!Number.isInteger(page) || page < 1 || page > 1000) throw new Error("Page de recherche invalide.");
  const url = new URL(DIRECTORY_URL);
  url.searchParams.set("est_association", "true");
  url.searchParams.set("etat_administratif", "A");
  url.searchParams.set("code_postal", lyonPostalCodes);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "20");
  return url.toString();
}

export async function discoverLyon(page: number, fetcher: typeof fetch = fetch): Promise<DiscoveryPage> {
  const response = await fetcher(discoveryUrl(page), {
    headers: { Accept: "application/json", "User-Agent": "DossierAssociations/0.3 (recherche manuelle; contact: annuaire-entreprises.data.gouv.fr)" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 429 ? "L’annuaire public est momentanément limité. Réessayez dans quelques instants." : `L’annuaire public ne répond pas (HTTP ${response.status}).`);
  const payload = responseSchema.parse(await response.json());
  const seen = new Set<string>();
  const candidates = payload.results.filter(result => {
    if (result.etat_administratif !== "A" || seen.has(result.siren)) return false;
    seen.add(result.siren);
    return true;
  }).map(result => {
    const lyonEstablishment = result.matching_etablissements?.find(place => /^6900[1-9]$/.test(place.code_postal || ""));
    const address = lyonEstablishment?.adresse || (result.siege?.code_postal && /^6900[1-9]$/.test(result.siege.code_postal) ? result.siege.adresse : null) || "Implantation lyonnaise indiquée par l’annuaire — adresse à vérifier";
    return {
      siren: result.siren,
      name: result.nom_complet,
      address,
      activityCode: result.activite_principale || null,
      officialUrl: `https://annuaire-entreprises.data.gouv.fr/entreprise/${result.siren}`,
    };
  });
  return { candidates, page: payload.page, totalPages: payload.total_pages, totalResults: payload.total_results, source: DIRECTORY_LABEL };
}
