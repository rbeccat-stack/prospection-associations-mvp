/** Read-only diagnostics. No credentials, no paid calls, no application writes. */
import { writeFile, mkdir } from 'node:fs/promises';
import { extractPage } from '../src/lib/collector';
import { parseCsvInputs } from '../src/lib/csv';
const targets = [
  ['annuaire-identite','https://recherche-entreprises.api.gouv.fr/search?q=901931105&per_page=1'],
  ['annuaire-filtres','https://recherche-entreprises.api.gouv.fr/search?code_postal=69003&etat_administratif=A&tranche_effectif_salarie=03,11,12&per_page=3'],
  ['bodacc','https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?limit=1&where=registre%3D%22901931105%22'],
  ['muodim','https://muodim.com/'],
  ['lyon-startup','https://lyonstartup.com/start-up'],
  ['lyon-startup-fiche','https://lyonstartup.com/start-up/abel-io'],
  ['pepites','https://lespepitestech.com/french-tech-hub/french-tech-one-lyon-saint-etienne'],
  ['pulsalys-actualite','https://www.pulsalys.fr/article/muodim-ouvre-son-capital-brgm-invest-et-iris-instruments-pour-accelerer-la-democratisation'],
  ['pulsalys-emplois','https://www.pulsalys.fr/article/rejoignez-laventure-pulsalys'],
  ['muodim-robots','https://muodim.com/robots.txt'],
] as const;
const results: unknown[] = [];
for (let i=0;i<targets.length;i+=2) {
  const batch = await Promise.all(targets.slice(i,i+2).map(async ([id,url])=>{
    const start=Date.now();
    try {
      const response=await fetch(url,{headers:{'User-Agent':'SwipeAndProspect/SourceAudit (read-only pilot)','Accept':'application/json,text/html,text/plain'},signal:AbortSignal.timeout(12000)});
      const reader=response.body?.getReader(); const chunks:Uint8Array[]=[];let size=0;
      if(reader) { while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw new Error('Body exceeds 2 MB');}chunks.push(value); } }
      const body=Buffer.concat(chunks).toString('utf8');
      let data:Record<string,unknown>={};
      if(response.headers.get('content-type')?.includes('json')) { const parsed=JSON.parse(body); data={keys:Object.keys(parsed),total:parsed.total_results??parsed.total_count,records:Array.isArray(parsed.results)?parsed.results.length:undefined,firstKeys:parsed.results?.[0]?Object.keys(parsed.results[0]):undefined}; }
      else { const page=extractPage(body,response.url);data={title:page.title,textChars:page.text.length,mentionsMuodim:/muodim/i.test(page.text),hasContact:/contact@muodim\.com/.test(page.text)}; }
      return {id,url,finalUrl:response.url,status:response.status,ms:Date.now()-start,contentType:response.headers.get('content-type'),retryAfter:response.headers.get('retry-after'),...data};
    } catch(error) { const e=error as Error & {cause?:{code?:string}}; return {id,url,status:null,error:e.message,code:e.cause?.code,ms:Date.now()-start}; }
  }));results.push(...batch); for(const result of batch)console.log(JSON.stringify(result));
}
const csv=parseCsvInputs('nom,url,localisation,activite,resume,source\nMuodim,https://muodim.com/,Lyon,Muographie,Exemple de test,Site officiel');
results.push({id:'csv-local',ok:csv.length===1&&csv[0].name==='Muodim',note:'Parser legacy validated on one synthetic company row; not wired into the company pilot.'});
const report={testedAt:new Date().toISOString(),scope:'Server HTTP probes, without credentials. EACCES means local network restrictions, not source rejection. A single sample does not validate pagination, coverage or production integration.',results};
await mkdir('docs/source-audit',{recursive:true});
await writeFile('docs/source-audit/probes.json',JSON.stringify(report,null,2));
