import { z } from "zod";

const shortText = z.string().trim().max(160);
const optionalText = z.string().trim().max(1200).optional();
const textList = z.array(z.string().trim().min(1).max(100)).max(20);
const optionalUrl = z.union([z.url().refine((value) => /^https?:\/\//i.test(value), "URL HTTP(S) requise"), z.literal("")]).optional();

export const targetingProfileSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom au ciblage").max(80),
  regions: textList,
  associationTypes: textList,
  themes: textList,
  sizePreference: shortText,
  digitalMaturity: shortText,
  needsSignals: textList,
  exclusions: textList,
  tone: shortText,
  offer: z.string().trim().max(2000).default(""),
}).strict();

export type TargetingProfile = z.infer<typeof targetingProfileSchema>;

const commonInput = {
  name: z.string().trim().min(1, "Indiquez le nom de l’association").max(160),
  url: optionalUrl,
  location: optionalText,
  activity: optionalText,
  summary: optionalText,
  sourceNote: optionalText,
};

export const testInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("url"), url: z.url().refine((value) => /^https?:\/\//i.test(value), "URL HTTP(S) requise"), name: z.string().trim().max(160).optional() }).strict(),
  z.object({ type: z.literal("manual"), ...commonInput }).strict(),
  z.object({ type: z.literal("csv"), ...commonInput }).strict(),
]);

export type TestInput = z.infer<typeof testInputSchema>;

export const sourceRecordSchema = z.object({
  id: z.string().uuid(),
  url: optionalUrl,
  label: z.string().trim().min(1).max(200),
  origin: z.enum(["user_input", "public_page"]),
  consultedAt: z.iso.datetime().optional(),
  publishedAt: z.iso.datetime().optional(),
  accessStatus: z.enum(["available", "unavailable", "not_checked"]),
  excerpt: optionalText,
}).strict();

export const claimSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(1200),
  kind: z.enum(["fact", "inference", "hypothesis", "unknown"]),
  sourceIds: z.array(z.string().uuid()).max(20),
  verification: z.enum(["sourced", "to_verify", "incomplete"]),
  evidence: z.array(z.object({ sourceId: z.string().uuid(), quote: z.string().min(1).max(600) }).strict()).max(10).default([]),
}).strict().superRefine((claim, ctx) => {
  if (claim.kind === "fact" && claim.sourceIds.length === 0) {
    ctx.addIssue({ code: "custom", path: ["sourceIds"], message: "Un fait nécessite une source" });
  }
});

export const outreachDraftSchema = z.object({
  channel: z.enum(["email", "linkedin", "other"]),
  angle: z.string().trim().max(1200),
  subject: z.string().trim().max(200),
  body: z.string().trim().max(8000),
  state: z.literal("draft"),
}).strict();

const qualificationAxisSchema = z.object({
  assessment: z.string().trim().min(1).max(1000),
  claimIds: z.array(z.string().uuid()).max(20),
  unknowns: z.array(z.string().trim().min(1).max(300)).max(10),
}).strict();

export const dossierSchema = z.object({
  schemaVersion: z.literal(1),
  preparation: z.enum(["manual", "ai_assisted"]),
  associationName: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(3000),
  summarySourceIds: z.array(z.string().uuid()).max(20),
  identity: z.object({
    location: optionalText,
    website: optionalUrl,
    activity: optionalText,
    sourceIds: z.object({
      location: z.array(z.string().uuid()).max(10),
      website: z.array(z.string().uuid()).max(10),
      activity: z.array(z.string().uuid()).max(10),
    }).strict(),
  }).strict(),
  sources: z.array(sourceRecordSchema).max(50),
  claims: z.array(claimSchema).max(100),
  contacts: z.array(z.object({
    type: z.enum(["email", "phone", "form", "linkedin", "person"]),
    label: z.string().trim().min(1).max(160),
    value: z.string().trim().min(1).max(500),
    sourceIds: z.array(z.string().uuid()).min(1).max(10),
  }).strict()).max(30),
  signals: z.array(z.object({
    claimId: z.string().uuid(),
    interpretation: z.string().trim().min(1).max(1200),
    confidence: z.enum(["low", "medium", "high"]),
  }).strict()).max(30),
  qualification: z.object({
    digitalDebt: qualificationAxisSchema,
    absorption: qualificationAxisSchema,
  }).strict().optional(),
  matches: z.array(z.object({ criterion: z.string().trim().min(1), status: z.enum(["match", "no_match", "unknown"]), explanation: z.string().trim().max(1200), claimIds: z.array(z.string().uuid()) }).strict()).max(50),
  approach: z.object({
    angle: z.string().trim().min(1).max(1200),
    rationale: z.string().trim().max(2000),
    sourceIds: z.array(z.string().uuid()).max(20),
    toVerify: z.array(z.string().trim().min(1).max(500)).max(20),
  }).strict(),
  reservations: z.array(z.string().trim().max(500)).max(50),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceReason: z.string().trim().max(1200),
  draft: outreachDraftSchema.optional(),
}).strict().superRefine((dossier, ctx) => {
  const sources = new Set(dossier.sources.map((source) => source.id));
  const claims = new Set(dossier.claims.map((claim) => claim.id));
  for (const sourceId of [...dossier.summarySourceIds, ...dossier.identity.sourceIds.location, ...dossier.identity.sourceIds.website, ...dossier.identity.sourceIds.activity, ...dossier.approach.sourceIds]) {
    if (!sources.has(sourceId)) ctx.addIssue({ code: "custom", path: ["sources"], message: "Référence de source inconnue" });
  }
  for (const [index, claim] of dossier.claims.entries()) {
    for (const sourceId of claim.sourceIds) {
      if (!sources.has(sourceId)) ctx.addIssue({ code: "custom", path: ["claims", index, "sourceIds"], message: "Source inconnue" });
    }
    if (claim.kind === "fact" && !claim.sourceIds.some((sourceId) => dossier.sources.some((source) => source.id === sourceId && source.accessStatus === "available"))) {
      ctx.addIssue({ code: "custom", path: ["claims", index, "sourceIds"], message: "Un fait nécessite une source consultable" });
    }
  }
  for (const [index, contact] of dossier.contacts.entries()) {
    for (const sourceId of contact.sourceIds) {
      if (!sources.has(sourceId)) ctx.addIssue({ code: "custom", path: ["contacts", index, "sourceIds"], message: "Source de contact inconnue" });
    }
    if (!contact.sourceIds.some((sourceId) => dossier.sources.some((source) => source.id === sourceId && source.accessStatus === "available"))) {
      ctx.addIssue({ code: "custom", path: ["contacts", index, "sourceIds"], message: "Un contact nécessite une source consultable" });
    }
  }
  for (const [index, signal] of dossier.signals.entries()) {
    if (!claims.has(signal.claimId)) ctx.addIssue({ code: "custom", path: ["signals", index, "claimId"], message: "Observation inconnue" });
  }
  if (dossier.qualification) {
    for (const axis of ["digitalDebt", "absorption"] as const) {
      for (const claimId of dossier.qualification[axis].claimIds) {
        if (!dossier.claims.some((claim) => claim.id === claimId && claim.kind === "fact")) {
          ctx.addIssue({ code: "custom", path: ["qualification", axis, "claimIds"], message: "La qualification exige un fait sourcé" });
        }
      }
    }
  }
  for (const [index, match] of dossier.matches.entries()) {
    for (const claimId of match.claimIds) {
      if (!claims.has(claimId)) ctx.addIssue({ code: "custom", path: ["matches", index, "claimIds"], message: "Affirmation inconnue" });
    }
  }
});

export type Dossier = z.infer<typeof dossierSchema>;

export const defaultProfile: TargetingProfile = {
  name: "Mon ciblage",
  regions: [],
  associationTypes: [],
  themes: [],
  sizePreference: "",
  digitalMaturity: "",
  needsSignals: [],
  exclusions: [],
  tone: "",
  offer: "",
};

export function listFromText(value: string): string[] {
  return [...new Set(value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean))];
}

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("URL HTTP(S) requise");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString().replace(/\/$/, "");
}

export function duplicateKey(input: TestInput): string {
  if (input.url) return `url:${canonicalizeUrl(input.url)}`;
  const name = input.name || (input.url ? new URL(input.url).hostname : "");
  const location = "location" in input ? input.location || "" : "";
  const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, " ").trim();
  return `name:${normalize(name)}|${normalize(location)}`;
}

export function inputLabel(input: TestInput): string {
  return input.name?.trim() || (input.url ? new URL(input.url).hostname : "Association sans nom");
}
