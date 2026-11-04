import { enrichCompany } from "../src/lib/company-enrichment";
import { enrichmentExamples } from "../src/lib/company-pilot-examples";

async function main() {
  for (const company of enrichmentExamples) {
    const result = await enrichCompany({ siren: company.siren, website: company.sources[0].url, pages: company.sources.slice(1).map(s => s.url) });
    console.log(JSON.stringify({ name: company.name, identity: result.identity, pages: result.pages.map(p => ({ url: p.url, status: p.status, error: p.error, sirens: p.sirens })) }));
    if (!result.pages.some(p => p.status === "available")) process.exitCode = 1;
  }
}
main().catch(() => { console.error("Le test des sites publics a échoué."); process.exitCode = 1; });
