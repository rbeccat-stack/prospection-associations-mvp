import { load } from "cheerio";
import { downloadPublicPage, networkMessage } from "./collector";
import { enrichmentInputSchema, enrichmentSchema, siteHost, type CompanyEnrichment, type EnrichmentPage } from "./company-enrichment-shared";

// A few explicit public pages, no crawling, AI call, or paid provider.
type Download = (url: string) => Promise<{ html: string; url: string }>;
const compact = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);
export function extractCompanyPage(html: string, url: string, consultedAt: string): EnrichmentPage {
  const $ = load(html);
  const title = compact($("title").first().text() || $("h1").first().text() || new URL(url).hostname, 200);
  const description = $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "";
  const published = $("meta[property='article:published_time']").attr("content");
  const parsedDate = published && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(published) ? Date.parse(published) : NaN;
  const publishedOn = Number.isFinite(parsedDate) && parsedDate <= Date.parse(consultedAt) ? new Date(parsedDate).toISOString().slice(0, 10) : undefined;
  $("script,style,noscript,iframe,svg,template").remove();
  $("p,div,li,br,h1,h2,h3,section,main,nav,footer,header").prepend("\n").append("\n");
  const text = $("body").text().replace(/\s+/g, " ").trim();
  if (text.length < 80) throw new Error("Contenu insuffisant ou site nécessitant JavaScript. Ajoutez une autre page publique.");
  // Read identifiers only near an explicit legal label, never from phone numbers.
  const sirens = [...text.matchAll(/(?:\bSIREN\b|\bSIRET\b|\bRCS\b|Registre du Commerce et des Sociétés)\D{0,55}(\d{3}[ .-]?\d{3}[ .-]?\d{3}(?:[ .-]?\d{5})?)(?!\d)/gi)]
    .map(match => match[1].replace(/\D/g, "").slice(0, 9));
  $("header,footer,nav,aside,[role='navigation']").remove();
  const content = $("main,article").first();
  const excerpt = compact(description || (content.length ? content : $("body")).text(), 180);
  return { url, title, excerpt, consultedAt, ...(publishedOn ? { publishedOn } : {}), status: "available", sirens: [...new Set(sirens)].slice(0, 20) };
}

export async function enrichCompany(raw: unknown, download: Download = downloadPublicPage, now = new Date().toISOString()): Promise<CompanyEnrichment> {
  const input = enrichmentInputSchema.parse(raw);
  const urls = [...new Set([input.website, ...input.pages].map(raw => { const u = new URL(raw); u.hash = ""; return u.href; }))];
  const pages: EnrichmentPage[] = [];
  // Sequential requests keep the site's load small and bound one operation to 3 pages.
  for (const url of urls) {
    try {
      const response = await download(url);
      if (siteHost(response.url) !== siteHost(input.website)) throw new Error("Redirection vers un autre site : vérifiez l’adresse officielle avant de continuer.");
      pages.push(extractCompanyPage(response.html, response.url, now));
    }
    catch (error) {
      const known = error instanceof Error && /^(URL publique|Les adresses|Redirection|Le site|Cette page|Page trop|Trop de|Contenu insuffisant|Résolution)/.test(error.message);
      const dnsError = /^EAI_|^ENOTFOUND$/.test(String((error as { code?: unknown })?.code || ""));
      const message = dnsError ? "Le serveur n’a pas pu résoudre ce domaine. Vérifiez l’adresse ou réessayez plus tard." : known ? error.message : networkMessage(error);
      pages.push({ url, title: new URL(url).hostname, excerpt: "", consultedAt: now, status: "unavailable", error: message.slice(0, 300), sirens: [] });
    }
  }
  const found = pages.flatMap(page => page.sirens);
  const identity = !input.siren || !found.length ? "unconfirmed" : found.some(siren => siren !== input.siren) ? "conflict" : "matched";
  return enrichmentSchema.parse({ provider: "official_website", website: urls[0], ...(input.siren ? { siren: input.siren } : {}), consultedAt: now, identity, pages });
}
