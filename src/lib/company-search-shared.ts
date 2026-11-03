import { z } from "zod";
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
export type DirectoryCompany = {
  siren: string; name: string; activityCode: string | null; createdAt: string | null;
  workforce: string; workforceYear: string | null; headOffice: string | null;
  localAddress: string | null; localSiret: string | null; officialUrl: string; consultedAt: string;
};
export type CompanySearchResult = { companies: DirectoryCompany[]; page: number; totalPages: number; totalResults: number; omitted: number; directLookup: boolean; sourceUrl: string; consultedAt: string };
export const isDirectLookup = (q:string) => /^(\d{9}|\d{14})$/.test(q);
