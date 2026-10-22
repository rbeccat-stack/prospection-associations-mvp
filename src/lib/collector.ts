import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { z } from "zod";
import { sourceRecordSchema } from "./schemas";
import { directorySirenFromUrl, officialRecord } from "./discovery";
import { joafeIdFromUrl, joafeNotice } from "./joafe";

export const collectedPageSchema = z.object({ source: sourceRecordSchema, text: z.string().max(18000), error: z.string().optional() });
export type CollectedPage = z.infer<typeof collectedPageSchema>;

export function isPublicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

export async function publicTarget(raw: string) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error("URL publique HTTP(S) sans identifiants requise.");
  let timer: ReturnType<typeof setTimeout>;
  const addresses = await Promise.race([
    lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Résolution du site trop longue.")), 4000); }),
  ]).finally(() => clearTimeout(timer!));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("Les adresses locales ou privées ne peuvent pas être collectées.");
  // Prefer IPv4: many hosting networks (Vercel functions included) cannot reach IPv6.
  return { url, address: addresses.find(({ family }) => family === 4) || addresses[0] };
}

export function extractPage(html: string, baseUrl?: string) {
  const $ = load(html);
  const title = $('title').text().trim().slice(0, 200);
  $('script,style,noscript,iframe,svg,template').remove();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (/^(mailto:|tel:)/i.test(href)) {
      $(element).append(` ${href.replace(/^(mailto:|tel:)/i, '').split('?')[0]}`);
    } else if (baseUrl) {
      try {
        const url = new URL(href, baseUrl);
        if (['http:', 'https:'].includes(url.protocol) && /contact|adh[eé]|inscri|newsletter|b[eé]n[eé]vol|donner|formulaire|linkedin/i.test(`${href} ${$(element).text()}`)) $(element).append(` (${url.href})`);
      } catch { /* Ignore invalid links; never execute or follow them here. */ }
    }
  });
  // Keep menu entries and table cells apart ("Enjeux Contexte", not "EnjeuxContexte").
  $('a,td,th,dt,dd,button,label,figcaption').append(' ');
  $('p,br,li,h1,h2,h3,div,section').append('\n');
  const text = $('body').text().replace(/[\t\r ]+/g, ' ').replace(/\n\s*\n/g, '\n').trim().slice(0, 18000);
  return { title, text };
}

async function download(raw: string, originalHost: string, redirects = 0): Promise<{ html: string; url: string }> {
  const target = await publicTarget(raw);
  if (target.url.hostname.replace(/^www\./, '') !== originalHost) {
    if (/(^|\.)accounts\.google\.com$|(^|[.-])(login|signin|auth)[.-]/i.test(target.url.hostname) || /\/(login|signin|connexion|ServiceLogin)/i.test(target.url.pathname)) throw new Error("Redirection vers une page de connexion : le site est privé ou supprimé.");
    throw new Error(`Redirection vers un autre site (${target.url.hostname}) : ajoutez cette URL explicitement.`);
  }
  const result = await new Promise<{ html: string; location?: string }>((resolve, reject) => {
    const request = (target.url.protocol === 'https:' ? https : http).request(target.url, {
      method: 'GET', agent: false, family: target.address.family,
      headers: { 'User-Agent': 'DossierAssociations/0.2 (collecte manuelle limitee)', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      // Épingler l'adresse validée empêche un changement DNS entre le contrôle et la connexion.
      lookup: ((_host: unknown, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, target.address.address, target.address.family)) as http.RequestOptions['lookup'],
    }, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) { response.resume(); resolve({ html: '', location: response.headers.location }); return; }
      if (status !== 200) { response.resume(); reject(new Error(status === 403 ? 'Le site refuse l’accès à cette page depuis le serveur de collecte (HTTP 403). Cela ne vient pas de votre clé IA. Ajoutez une autre source publique décrivant cette association, puis recollectez.' : `Le site répond HTTP ${status}.`)); return; }
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(response.headers['content-type'] || '')) { response.resume(); reject(new Error("Cette page n'est pas un document HTML ou texte.")); return; }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 3_000_000) request.destroy(new Error("Page trop volumineuse (limite 3 Mo).")); else chunks.push(chunk); });
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    const timer = setTimeout(() => request.destroy(new Error("Le site n'a pas répondu sous 12 secondes.")), 12000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', reject);
    request.end();
  });
  if (result.location) {
    if (redirects >= 3) throw new Error("Trop de redirections.");
    return download(new URL(result.location, raw).toString(), originalHost, redirects + 1);
  }
  return { html: result.html, url: target.url.toString() };
}

// Internal pages most useful to qualify an association, in priority order.
const SITE_PAGE_KINDS = [
  /contact|nous[-_ ]?contacter|coordonn/i,
  /adh[eé]r|adh[eé]sion|inscri|rejoindre|devenir[-_ ]membre|cotisation/i,
  /qui[-_ ]sommes|[àa][-_ ]propos|l[-_’']?association|pr[ée]sentation|notre[-_ ]histoire|[ée]quipe/i,
  /agenda|programme|[ée]v[ée]nement|actualit|saison|concert|spectacle|activit[ée]s|ateliers?|cours/i,
  /b[ée]n[ée]vol|soutenir|faire[-_ ]un[-_ ]don|partenai|participer/i,
];

export function siteLinks(html: string, baseUrl: string, max = 4): string[] {
  const $ = load(html);
  const base = new URL(baseUrl);
  const host = base.hostname.replace(/^www\./, '');
  const links: { url: string; label: string }[] = [];
  $('a[href]').each((_, element) => {
    try {
      const url = new URL($(element).attr('href') || '', base);
      url.hash = '';
      if (!['http:', 'https:'].includes(url.protocol) || url.hostname.replace(/^www\./, '') !== host) return;
      if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp3|mp4)$/i.test(url.pathname)) return;
      if (url.pathname.replace(/\/+$/, '') === base.pathname.replace(/\/+$/, '') && !url.search) return;
      links.push({ url: url.toString(), label: `${decodeURIComponent(url.pathname)} ${$(element).text()}`.replace(/\s+/g, ' ') });
    } catch { /* Ignore invalid links; never execute or follow them here. */ }
  });
  const selected: string[] = [];
  for (const kind of SITE_PAGE_KINDS) {
    const match = links.find(link => kind.test(link.label) && !selected.includes(link.url));
    if (match) selected.push(match.url);
    if (selected.length >= max) break;
  }
  return selected;
}

// Readable causes for network failures; raw system messages are never shown.
export function networkMessage(error: unknown): string {
  const code = String((error as { code?: unknown })?.code || '');
  if (['ENOTFOUND', 'EAI_NONAME', 'EAI_NODATA'].includes(code)) return "Le domaine du site n'existe plus (adresse introuvable).";
  if (code === 'EAI_AGAIN') return "Le nom du site n'a pas pu être résolu pour le moment. Réessayez plus tard.";
  if (code === 'ECONNREFUSED') return "Le serveur du site refuse la connexion.";
  if (['ECONNRESET', 'EPIPE'].includes(code)) return "Le serveur du site a interrompu la connexion.";
  if (['ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH'].includes(code)) return "Le serveur du site est injoignable.";
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)) return "Le certificat de sécurité du site est invalide ou expiré.";
  return "Impossible de consulter cette page. Vérifiez l'URL ou essayez une autre source publique.";
}

async function collectHtml(raw: string): Promise<{ page: CollectedPage; html?: string }> {
  const source: CollectedPage['source'] = { id: randomUUID(), url: raw, label: new URL(raw).hostname, origin: 'public_page', consultedAt: new Date().toISOString(), accessStatus: 'unavailable' };
  try {
    const directorySiren = directorySirenFromUrl(raw);
    if (directorySiren) {
      const record = await officialRecord(directorySiren);
      return { page: { source: { ...source, url: record.url, label: record.label, accessStatus: 'available' }, text: record.text } };
    }
    const noticeId = joafeIdFromUrl(raw);
    if (noticeId) {
      const notice = await joafeNotice(noticeId);
      return { page: { source: { ...source, url: notice.url, label: notice.label, accessStatus: 'available' }, text: notice.text } };
    }
    const response = await download(raw, new URL(raw).hostname.replace(/^www\./, ''));
    const parsed = extractPage(response.html, response.url);
    if (parsed.text.length < 80) throw new Error("Contenu insuffisant ou page nécessitant JavaScript.");
    return { page: { source: { ...source, url: response.url, label: parsed.title || source.label, accessStatus: 'available' }, text: parsed.text }, html: response.html };
  } catch (error) {
    const known = error instanceof Error && /^(URL publique|Les adresses|Redirection|Le site|Cette page|Page trop|Trop de|Contenu insuffisant|Résolution|L’annuaire public|SIREN introuvable|Le Journal officiel)/.test(error.message);
    return { page: { source, text: '', error: known ? (error as Error).message : networkMessage(error) } };
  }
}

export async function collectPage(raw: string): Promise<CollectedPage> {
  return (await collectHtml(raw)).page;
}

// Homepage first, then a few internal pages chosen from its links. Unreadable
// internal pages are left out; an unreadable homepage is returned with its error.
export async function collectSite(raw: string, maxPages = 5): Promise<CollectedPage[]> {
  const home = await collectHtml(raw);
  if (!home.html || home.page.source.accessStatus !== 'available') return [home.page];
  const pages = await Promise.all(siteLinks(home.html, home.page.source.url || raw, maxPages - 1).map(url => collectPage(url)));
  return [home.page, ...pages.filter(page => page.source.accessStatus === 'available')];
}
