import { randomInt } from "node:crypto";
import { z } from "zod";

// Journal officiel des associations et fondations d’entreprise (DILA), open data.
export const JOAFE_API = "https://journal-officiel-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets";
export const JOAFE_LABEL = "Journal officiel des associations (JOAFE) — DILA";
const LYON = 'codepostal_actuel like "6900*"';
const WITH_SITE = `${LYON} and siteweb is not null`;
// Familles écartées du tirage : financement de partis et activités politiques.
const EXCLUDED_FAMILIES = new Set(["1000"]);
export const MIN_DOMAIN_CANDIDATES = 5;
// Sites qui exigent JavaScript ou une connexion : le collecteur ne peut pas les lire.
const UNREADABLE_HOSTS = /(^|\.)(facebook\.com|fb\.com|instagram\.com|linktr\.ee|twitter\.com|x\.com|youtube\.com|linkedin\.com|tiktok\.com)$/i;

export type JoafeDomain = { code: string; label: string; family: string; candidates: number };
export type JoafeRecord = {
  id: string; rna: string; title: string; website: string; objet: string; address: string; postalCode: string; commune: string;
  publishedAt: string; declaredAt: string | null; noticeType: string; siren: string | null; domains: string[];
};

const recordSchema = z.object({
  id: z.string().min(1),
  numero_rna: z.string().regex(/^W\d{9}$/),
  titre: z.string().min(1),
  siteweb: z.string().nullish(),
  objet: z.string().nullish(),
  adresse_actuelle: z.string().nullish(),
  codepostal_actuel: z.string().nullish(),
  commune_actuelle: z.string().nullish(),
  dateparution: z.string(),
  datedeclaration: z.string().nullish(),
  typeavis: z.string().nullish(),
  dca_siren: z.string().nullish(),
  domaine_activite_libelle_categorise: z.array(z.string()).nullish(),
}).passthrough();
const recordsSchema = z.object({ total_count: z.number().int().nonnegative().optional(), results: z.array(z.unknown()) }).passthrough();

async function query(fetcher: typeof fetch, dataset: string, params: Record<string, string>) {
  const url = new URL(`${JOAFE_API}/${dataset}/records`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetcher(url, { headers: { Accept: "application/json", "User-Agent": "DossierAssociations/0.4 (preparation des editions)" }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error(`Le Journal officiel des associations ne répond pas (HTTP ${response.status}).`);
  return recordsSchema.parse(await response.json()).results;
}

export function shuffle<T>(items: T[], random: (max: number) => number = randomInt): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = random(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function normalizeWebsite(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value || (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value))) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) return null;
    if (UNREADABLE_HOSTS.test(url.hostname)) return null;
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

// Precise sub-domains only ("6000/6030"): family-only codes ("6000/") are too vague for a category.
export async function eligibleDomains(fetcher: typeof fetch = fetch): Promise<JoafeDomain[]> {
  const counts = z.array(z.object({ code: z.string().nullable(), n: z.number() }).passthrough()).parse(await query(fetcher, "jo_associations", {
    select: "domaine_activite_categorise as code, count(distinct numero_rna) as n", where: WITH_SITE,
    group_by: "domaine_activite_categorise", order_by: "n desc", limit: "100",
  }));
  const nomenclature = new Map<string, string>();
  for (const offset of [0, 100, 200]) {
    const rows = z.array(z.object({ domaine_path: z.string(), domaine_libelle: z.string() }).passthrough()).parse(await query(fetcher, "joafe_domaine_activite", { select: "domaine_path, domaine_libelle", limit: "100", offset: String(offset) }));
    for (const row of rows) nomenclature.set(row.domaine_path, row.domaine_libelle);
    if (rows.length < 100) break;
  }
  return counts.flatMap(({ code, n }) => {
    const match = /^(\d+)\/(\d+)$/.exec(code || "");
    if (!match || EXCLUDED_FAMILIES.has(match[1]) || n < MIN_DOMAIN_CANDIDATES) return [];
    const label = nomenclature.get(code!);
    return label ? [{ code: code!, label, family: nomenclature.get(`${match[1]}/`) || "", candidates: n }] : [];
  });
}

export async function domainRecords(code: string, fetcher: typeof fetch = fetch): Promise<JoafeRecord[]> {
  if (!/^\d+\/\d+$/.test(code)) throw new Error("Catégorie invalide.");
  const select = "id, numero_rna, titre, siteweb, objet, adresse_actuelle, codepostal_actuel, commune_actuelle, dateparution, datedeclaration, typeavis, dca_siren, domaine_activite_libelle_categorise";
  const raw: unknown[] = [];
  for (const offset of [0, 100]) {
    const page = await query(fetcher, "jo_associations", { select, where: `${WITH_SITE} and domaine_activite_categorise = "${code}"`, order_by: "dateparution desc", limit: "100", offset: String(offset) });
    raw.push(...page);
    if (page.length < 100) break;
  }
  // Keep the latest notice per association; an older one may still carry the declared purpose.
  const byRna = new Map<string, JoafeRecord>();
  for (const item of raw) {
    const parsed = recordSchema.safeParse(item);
    if (!parsed.success) continue;
    const value = parsed.data;
    const website = normalizeWebsite(value.siteweb);
    const existing = byRna.get(value.numero_rna);
    if (existing) { if (!existing.objet && value.objet) existing.objet = value.objet.trim(); continue; }
    if (!website || !/^6900[1-9]$/.test(value.codepostal_actuel || "")) continue;
    byRna.set(value.numero_rna, {
      id: value.id, rna: value.numero_rna, title: value.titre.trim(), website, objet: (value.objet || "").trim(),
      address: (value.adresse_actuelle || "").trim(), postalCode: value.codepostal_actuel!, commune: (value.commune_actuelle || "").trim(),
      publishedAt: value.dateparution, declaredAt: value.datedeclaration || null, noticeType: value.typeavis || "", siren: value.dca_siren || null,
      domains: value.domaine_activite_libelle_categorise || [],
    });
  }
  const records = [...byRna.values()];
  if (!records.length) return [];
  const dissolved = new Set<string>();
  for (let start = 0; start < records.length; start += 80) {
    const list = records.slice(start, start + 80).map(record => `"${record.rna}"`).join(",");
    const rows = z.array(z.object({ numero_rna: z.string() }).passthrough()).parse(await query(fetcher, "jo_associations", { select: "numero_rna", where: `typeavis = "Dissolution" and numero_rna in (${list})`, limit: "100" }));
    for (const row of rows) dissolved.add(row.numero_rna);
  }
  return records.filter(record => !dissolved.has(record.rna));
}

export function joafeNoticeUrl(id: string): string {
  if (!/^\d{6,20}$/.test(id)) throw new Error("Annonce invalide.");
  return `https://www.journal-officiel.gouv.fr/pages/associations-detail-annonce/?q.id=id:${id}`;
}

export function joafeIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "www.journal-officiel.gouv.fr" || url.pathname !== "/pages/associations-detail-annonce/") return null;
    return /^id:(\d{6,20})$/.exec(url.searchParams.get("q.id") || "")?.[1] || null;
  } catch { return null; }
}

export function joafeText(record: JoafeRecord): string {
  return [
    `Annonce du Journal officiel des associations publiée le ${record.publishedAt}${record.noticeType ? ` (${record.noticeType.toLocaleLowerCase("fr")})` : ""}`,
    `Nom déclaré : ${record.title}`,
    `Numéro RNA : ${record.rna}`,
    record.objet ? `Objet déclaré : ${record.objet}` : "",
    record.address || record.commune ? `Adresse actuelle déclarée : ${[record.address, `${record.postalCode} ${record.commune}`.trim()].filter(Boolean).join(", ")}` : "",
    record.declaredAt ? `Date de déclaration en préfecture : ${record.declaredAt}` : "",
    record.domains.length ? `Domaine(s) d’activité déclaré(s) : ${record.domains.join(" ; ")}` : "",
    `Site web déclaré : ${record.website}`,
    record.siren ? `SIREN : ${record.siren}` : "",
  ].filter(Boolean).join("\n").slice(0, 18000);
}

export async function joafeNotice(id: string, fetcher: typeof fetch = fetch) {
  const rows = await query(fetcher, "jo_associations", { where: `id = "${id.replace(/\D/g, "")}"`, limit: "1" });
  const value = recordSchema.parse(rows[0]);
  const record: JoafeRecord = {
    id: value.id, rna: value.numero_rna, title: value.titre.trim(), website: normalizeWebsite(value.siteweb) || (value.siteweb || "").trim() || "non déclaré", objet: (value.objet || "").trim(),
    address: (value.adresse_actuelle || "").trim(), postalCode: value.codepostal_actuel || "", commune: (value.commune_actuelle || "").trim(),
    publishedAt: value.dateparution, declaredAt: value.datedeclaration || null, noticeType: value.typeavis || "", siren: value.dca_siren || null, domains: value.domaine_activite_libelle_categorise || [],
  };
  return { url: joafeNoticeUrl(record.id), label: `Journal officiel — ${record.title}`.slice(0, 200), text: joafeText(record) };
}
