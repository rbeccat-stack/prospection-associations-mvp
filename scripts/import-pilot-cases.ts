import { readFileSync } from "node:fs";
import { getDb, createRuns, findDuplicates, saveDossier, saveProfile } from "../src/lib/store";
import { dossierSchema, targetingProfileSchema, type TestInput } from "../src/lib/schemas";

// Import volontaire et ponctuel des deux cas choisis pour le pilote de trois associations.
const profile = targetingProfileSchema.parse({
  name: "Associations lyonnaises — appui numérique et IA à qualifier",
  regions: ["Lyon"],
  associationTypes: ["association locale"],
  themes: [],
  sizePreference: "",
  digitalMaturity: "À évaluer sans la déduire de la seule présence web",
  needsSignals: [
    "manque de temps pour le numérique — à confirmer",
    "budget numérique limité — à confirmer",
    "tâches récurrentes à simplifier — à confirmer",
  ],
  exclusions: ["déjà contactée"],
  tone: "sobre, respectueux et exploratoire",
});

const cases: { input: TestInput; file: string }[] = [
  { input: { type: "url", url: "http://www.kotopo.net/", name: "KoToPo" }, file: "examples/kotopo-dossier.json" },
  { input: { type: "url", url: "https://www.anciela.info/", name: "Anciela" }, file: "examples/anciela-dossier.json" },
];

const prepared = cases.map(({ input, file }) => ({ input, dossier: dossierSchema.parse(JSON.parse(readFileSync(file, "utf8"))) }));
const db = getDb();
const duplicates = findDuplicates(db, prepared.map(({ input }) => input));
if (duplicates.length) throw new Error(`Un cas pilote est déjà présent : ${duplicates.map(({ label }) => label).join(", ")}`);

const imported = db.transaction(() => {
  const savedProfile = saveProfile(db, profile);
  const runs = createRuns(db, prepared.map(({ input }) => input));
  for (const [index, run] of runs.entries()) saveDossier(db, run.id, prepared[index].dossier);
  return { savedProfile, runs };
}).immediate();

console.log(JSON.stringify({
  profileVersion: imported.savedProfile.version,
  runs: imported.runs.map(({ id, label }) => ({ id, label })),
}, null, 2));
