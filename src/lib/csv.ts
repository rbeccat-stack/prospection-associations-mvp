import { parse } from "csv-parse/sync";
import { testInputSchema, type TestInput } from "./schemas";

const allowed = new Set(["nom", "url", "localisation", "activite", "resume", "source"]);

export function parseCsvInputs(csvText: string): TestInput[] {
  if (csvText.length > 25_000) throw new Error("Le CSV dépasse 25 Ko.");
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      bom: true,
      columns: (headers: string[]) => headers.map((header) => header.trim().toLocaleLowerCase("fr")),
      skip_empty_lines: true,
      trim: true,
      max_record_size: 5000,
      relax_quotes: false,
    });
  } catch {
    throw new Error("CSV invalide. Vérifiez les colonnes et les guillemets.");
  }
  if (records.length < 1 || records.length > 10) throw new Error("Le CSV doit contenir de 1 à 10 lignes.");
  const headers = Object.keys(records[0]);
  if (!headers.includes("nom") || headers.some((header) => !allowed.has(header))) {
    throw new Error("Colonnes autorisées : nom, url, localisation, activite, resume, source. La colonne nom est obligatoire.");
  }
  return records.map((record, index) => {
    const result = testInputSchema.safeParse({
      type: "csv",
      name: record.nom || "",
      url: record.url || "",
      location: record.localisation || "",
      activity: record.activite || "",
      summary: record.resume || "",
      sourceNote: record.source || "",
    });
    if (!result.success) throw new Error(`Ligne ${index + 2} invalide : ${result.error.issues[0]?.message || "données incorrectes"}`);
    return result.data;
  });
}
