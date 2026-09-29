import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { z } from "zod";
import { sourceRecordSchema } from "./schemas";

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
  return { url, address: addresses[0] };
}

export function extractPage(html: string) {
  const $ = load(html);
  const title = $('title').text().trim().slice(0, 200);
  $('script,style,noscript,iframe,svg,template').remove();
  $('a[href^="mailto:"]').each((_, element) => { $(element).append(` ${$(element).attr('href')?.slice(7).split('?')[0] || ''}`); });
  $('p,br,li,h1,h2,h3,div,section').append('\n');
  const text = $('body').text().replace(/[\t\r ]+/g, ' ').replace(/\n\s*\n/g, '\n').trim().slice(0, 18000);
  return { title, text };
}

async function download(raw: string, originalHost: string, redirects = 0): Promise<{ html: string; url: string }> {
  const target = await publicTarget(raw);
  if (target.url.hostname.replace(/^www\./, '') !== originalHost) throw new Error("Redirection vers un autre site : ajoutez cette URL explicitement.");
  const result = await new Promise<{ html: string; location?: string }>((resolve, reject) => {
    const request = (target.url.protocol === 'https:' ? https : http).request(target.url, {
      method: 'GET', agent: false, family: target.address.family,
      headers: { 'User-Agent': 'DossierAssociations/0.2 (collecte manuelle limitee)', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      // Épingler l'adresse validée empêche un changement DNS entre le contrôle et la connexion.
      lookup: ((_host: unknown, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, target.address.address, target.address.family)) as http.RequestOptions['lookup'],
    }, (response) => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) { response.resume(); resolve({ html: '', location: response.headers.location }); return; }
      if (status !== 200) { response.resume(); reject(new Error(`Le site répond HTTP ${status}.`)); return; }
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(response.headers['content-type'] || '')) { response.resume(); reject(new Error("Cette page n'est pas un document HTML ou texte.")); return; }
      let size = 0;
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 1_000_000) request.destroy(new Error("Page trop volumineuse (limite 1 Mo).")); else chunks.push(chunk); });
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

export async function collectPage(raw: string): Promise<CollectedPage> {
  const source: CollectedPage['source'] = { id: randomUUID(), url: raw, label: new URL(raw).hostname, origin: 'public_page', consultedAt: new Date().toISOString(), accessStatus: 'unavailable' };
  try {
    const response = await download(raw, new URL(raw).hostname.replace(/^www\./, ''));
    const parsed = extractPage(response.html);
    if (parsed.text.length < 80) throw new Error("Contenu insuffisant ou page nécessitant JavaScript.");
    return { source: { ...source, url: response.url, label: parsed.title || source.label, accessStatus: 'available' }, text: parsed.text };
  } catch (error) {
    const known = error instanceof Error && /^(URL publique|Les adresses|Redirection|Le site|Cette page|Page trop|Trop de|Contenu insuffisant|Résolution)/.test(error.message);
    return { source, text: '', error: known ? (error as Error).message : "Impossible de consulter cette page. Vérifiez l'URL ou essayez une autre source publique." };
  }
}
