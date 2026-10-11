import { z } from "zod";

export const DIRECTORY_URL = "https://recherche-entreprises.api.gouv.fr/search";
export const DIRECTORY_LABEL = "API Recherche d’entreprises — Annuaire des entreprises";
const lyonPostalCodes = Array.from({ length: 9 }, (_, index) => `6900${index + 1}`).join(",");

const resultSchema = z.object({
  siren: z.string().regex(/^\d{9}$/),
  nom_complet: z.string().min(1),
  activite_principale: z.string().nullish(),
  etat_administratif: z.string().nullish(),
  date_creation: z.string().nullish(),
  tranche_effectif_salarie: z.string().nullish(),
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

export function directorySirenFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hash || url.username || url.password || url.port) return null;
    if (url.hostname === "recherche-entreprises.api.gouv.fr" && url.pathname === "/search" && /^\d{9}$/.test(url.searchParams.get("q") || "") && [...url.searchParams.keys()].every(key => ["q", "per_page"].includes(key))) return url.searchParams.get("q");
    if (url.hostname !== "annuaire-entreprises.data.gouv.fr" || url.search) return null;
    return /^\/entreprise\/(\d{9})\/?$/.exec(url.pathname)?.[1] || null;
  } catch { return null; }
}

export function officialRecordUrl(siren: string): string {
  if (!/^\d{9}$/.test(siren)) throw new Error("SIREN invalide.");
  const url = new URL(DIRECTORY_URL);
  url.searchParams.set("q", siren);
  url.searchParams.set("per_page", "1");
  return url.toString();
}

export async function officialRecord(siren: string, fetcher: typeof fetch = fetch) {
  const url = officialRecordUrl(siren);
  const response = await fetcher(url, {
    headers: { Accept: "application/json", "User-Agent": "DossierAssociations/0.3 (consultation fiche publique)" },
    signal: AbortSignal.timeout(12000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`L’annuaire public ne répond pas (HTTP ${response.status}).`);
  const payload = responseSchema.parse(await response.json());
  const result = payload.results.find(item => item.siren === siren);
  if (!result) throw new Error("SIREN introuvable dans l’annuaire public.");
  const lines = [
    `Nom déclaré : ${result.nom_complet}`,
    `SIREN : ${result.siren}`,
    `État administratif : ${result.etat_administratif === "A" ? "actif" : result.etat_administratif === "C" ? "cessé" : "non renseigné"}`,
    result.siege?.adresse ? `Adresse du siège déclaré : ${result.siege.adresse}` : "",
    result.activite_principale ? `Code d’activité principale (APE) : ${result.activite_principale}` : "",
    result.date_creation ? `Date de création déclarée : ${result.date_creation}` : "",
    result.tranche_effectif_salarie === "NN" ? "Tranche d’effectif salarié : inconnue (NN ne signifie pas zéro salarié)" : result.tranche_effectif_salarie ? `Code de tranche d’effectif salarié : ${result.tranche_effectif_salarie} (à interpréter avec l’année et la nomenclature)` : "",
  ].filter(Boolean);
  return { url, label: `Annuaire public — ${result.nom_complet}`.slice(0, 200), text: lines.join("\n").slice(0, 18000) };
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
