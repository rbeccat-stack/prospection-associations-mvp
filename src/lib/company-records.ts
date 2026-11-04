import { z } from "zod";
import type { DirectoryCompany } from "./company-search-shared";

export function isPublicWebUrl(value: string): boolean {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
const webUrl = z.string().max(2000).refine(isPublicWebUrl, "Indiquez une URL commençant par https:// ou http://, sans identifiants.");
const day = z.string().refine(value => {
  if (!value) return true;
  const timestamp = Date.parse(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}, "Indiquez une date valide.");
export const sourceSchema = z.object({ id: z.string().min(1), label: z.string().trim().min(1, "Nommez la source.").max(180), url: webUrl, consultedOn: day });
export const companyEditableSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l’entreprise est obligatoire.").max(180),
  sector: z.string().trim().max(200), city: z.string().trim().max(500),
  description: z.string().trim().max(10000), signal: z.string().trim().max(10000),
  idea: z.string().trim().max(10000), notes: z.string().max(20000),
  email: z.union([z.literal(""), z.email()]), sources: z.array(sourceSchema).max(30).refine(sources => new Set(sources.map(s => s.id)).size === sources.length, "Chaque source doit avoir un identifiant distinct."),
});
export type CompanyEditable = z.infer<typeof companyEditableSchema>;
const nullableText = z.string().nullable();
const directorySchema = z.object({
  siren: z.string().regex(/^\d{9}$/), name: z.string(), activityCode: nullableText, createdAt: nullableText,
  workforce: z.string(), workforceYear: nullableText, headOffice: nullableText, localAddress: nullableText,
  localSiret: nullableText, officialUrl: webUrl, consultedAt: z.string().datetime(), warnings: z.array(z.string()).optional(),
});
const companySchema = companyEditableSchema.extend({
  id: z.string().min(1), siren: z.string().regex(/^\d{9}$/).optional(), directory: directorySchema.optional(),
  source: z.string().default(""), updatedAt: z.string().datetime().optional(),
  notes: z.string().max(20000).default(""), sources: z.array(sourceSchema).max(30).default([]),
});
export type Company = z.infer<typeof companySchema>;
const stateSchema = z.object({
  companies: z.array(companySchema), choices: z.record(z.string(), z.enum(["keep", "pass"])),
  decisions: z.record(z.string(), z.enum(["prospect", "later"])),
  subjects: z.record(z.string(), z.string()), messages: z.record(z.string(), z.string()),
});
export type PilotState = z.infer<typeof stateSchema>;
export const emptyCompany: CompanyEditable = { name: "", sector: "", city: "", description: "", signal: "", idea: "", notes: "", email: "", sources: [] };

// Keep the storage key and all choices/drafts from the first pilot.
export function parsePilotState(raw: unknown): PilotState {
  const state = stateSchema.parse(raw);
  if (new Set(state.companies.map(c => c.id)).size !== state.companies.length) throw new Error("Identifiants de fiches en double.");
  return { ...state, companies: state.companies.map(c => ({ ...c,
    siren: c.siren || c.directory?.siren || (c.id === "muodim" ? "901931105" : undefined),
    sources: c.sources.length || !isPublicWebUrl(c.source) ? c.sources : [{ id: `legacy-${c.id}`, label: "Source du profil", url: c.source, consultedOn: "" }],
  })) };
}

export function saveCompany(company: Company, changes: CompanyEditable, now = new Date().toISOString()): Company {
  // Pick only editable properties: callers cannot overwrite a SIREN or snapshot.
  return { ...company, ...companyEditableSchema.parse(changes), source: "", updatedAt: now };
}

export function importDirectoryCompany(state: PilotState, record: DirectoryCompany): PilotState {
  const existing = state.companies.find(c => c.siren === record.siren || c.id === `siren-${record.siren}` || (c.id === "muodim" && record.siren === "901931105"));
  if (existing) return { ...state, companies: state.companies.map(c => c.id === existing.id ? { ...c, siren: record.siren, directory: record } : c) };
  const company: Company = { ...emptyCompany, id: `siren-${record.siren}`, siren: record.siren, directory: record,
    name: record.name, sector: record.activityCode ? `APE ${record.activityCode}` : "", city: record.localAddress || record.headOffice || "", source: "" };
  return { ...state, companies: [...state.companies, company] };
}
