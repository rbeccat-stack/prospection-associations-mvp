import { z } from "zod";

const publicUrl = z.string().max(2000).refine(value => {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password && (!u.port || ["80", "443"].includes(u.port)); }
  catch { return false; }
}, "Indiquez une URL publique HTTP(S) sans identifiants.");
export const siteHost = (value: string) => new URL(value).hostname.toLowerCase().replace(/^www\./, "");
export const enrichmentInputSchema = z.object({
  siren: z.string().regex(/^\d{9}$/).optional(),
  website: publicUrl,
  pages: z.array(publicUrl).max(2).default([]),
}).refine(input => input.pages.every(page => siteHost(page) === siteHost(input.website)), "Les pages doivent appartenir au même site que l’entreprise.");
export const enrichmentPageSchema = z.object({
  url: publicUrl, title: z.string().max(200), excerpt: z.string().max(180),
  consultedAt: z.string().datetime(), publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["available", "unavailable"]), error: z.string().max(300).optional(),
  sirens: z.array(z.string().regex(/^\d{9}$/)).max(20),
});
export const enrichmentSchema = z.object({
  provider: z.literal("official_website"), website: publicUrl,
  siren: z.string().regex(/^\d{9}$/).optional(), consultedAt: z.string().datetime(),
  identity: z.enum(["matched", "unconfirmed", "conflict"]),
  pages: z.array(enrichmentPageSchema).min(1).max(3),
});
export type CompanyEnrichment = z.infer<typeof enrichmentSchema>;
export type EnrichmentPage = z.infer<typeof enrichmentPageSchema>;

export function canAcceptEnrichment(result: CompanyEnrichment): boolean {
  return result.identity !== "conflict" && result.pages.some(page => page.status === "available");
}
