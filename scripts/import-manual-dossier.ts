import { readFileSync } from "node:fs";
import path from "node:path";
import { getDb, saveDossier } from "../src/lib/store";
import { dossierSchema } from "../src/lib/schemas";

const [, , runId, filePath] = process.argv;
if (!runId || !filePath) {
  console.error("Usage : node --import tsx scripts/import-manual-dossier.ts <id-test> <fichier-json>");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
const content = dossierSchema.parse(JSON.parse(readFileSync(absolutePath, "utf8")));
const saved = await saveDossier(await getDb(), runId, content);
console.log(`Dossier manuel enregistré : ${saved.id} (test ${saved.runId})`);
