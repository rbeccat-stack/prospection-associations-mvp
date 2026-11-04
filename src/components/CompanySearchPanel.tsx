"use client";

import { useEffect, useRef, useState } from "react";
import { territories, sizes, sectors, isDirectLookup } from "@/lib/company-search-shared";
import type { CompanySearch, CompanySearchResult, DirectoryCompany } from "@/lib/company-search-shared";

type Props={addedSirens:string[]; onAdd:(company:DirectoryCompany)=>void};
const defaults:CompanySearch={q:"",territory:"lyon",sector:"all",size:"any",page:1};
export default function CompanySearchPanel({addedSirens,onAdd}:Props) {
  const [filters,setFilters]=useState(defaults);
  const [result,setResult]=useState<CompanySearchResult|null>(null);
  const [feedback,setFeedback]=useState("");
  const [submitted,setSubmitted]=useState<CompanySearch|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const [waitUntil,setWaitUntil]=useState(0); const [waiting,setWaiting]=useState(false);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{if(!waitUntil)return;setWaiting(true);const timer=setTimeout(()=>setWaiting(false),Math.max(0,waitUntil-Date.now()));return()=>clearTimeout(timer);},[waitUntil]);
  function update(next:Partial<CompanySearch>) { controller.current?.abort(); controller.current=null;setBusy(false);setFilters(s=>({...s,...next,page:1}));setResult(null);setSubmitted(null);setError("");setFeedback(""); }
  async function run(input:CompanySearch) {
    controller.current?.abort();const current=new AbortController();controller.current=current;setBusy(true);setError("");setFeedback("");setResult(null);
    try {
      const query=new URLSearchParams(Object.entries(input).map(([k,v])=>[k,String(v)]));
      const response=await fetch(`/api/companies/search?${query}`,{signal:current.signal,cache:"no-store"});
      const payload=await response.json();
      if(controller.current!==current)return;
      if(!response.ok) {
        if(response.status===429) {const delay=Number(response.headers.get("retry-after")||30);setWaitUntil(Date.now()+Math.min(Math.max(delay,1),300)*1000);}
        throw new Error(payload.error||"La recherche a échoué.");
      }
      if(controller.current!==current)return;
      setResult(payload);setSubmitted(input);
    }catch(e){if(controller.current===current&&!current.signal.aborted)setError(e instanceof Error?e.message:"Impossible de consulter les résultats.");}
    finally{if(controller.current===current)setBusy(false);}
  }
  const direct=isDirectLookup(filters.q.trim());
  return <section className="company-search"><p className="kicker">API Sirene de l’Insee</p><h1>Trouver votre<br/>prochaine rencontre.</h1><p className="muted">Recherchez des entreprises actives et ajoutez celles qui vous intéressent à vos profils à découvrir.</p>
    <form onSubmit={e=>{e.preventDefault();void run({...filters,q:filters.q.trim(),page:1});}}>
      <label>Dénomination, SIREN ou SIRET<input maxLength={120} value={filters.q} onChange={e=>update({q:e.target.value})} placeholder="Ex. Muodim ou 901931105"/></label>
      <p className="note">La recherche textuelle porte sur la dénomination officielle, pas sur l’adresse ou le site web.</p>
      {direct&&<p className="notice">Recherche par identifiant : les filtres ci-dessous ne s’appliquent pas. Une entreprise hors zone peut être trouvée.</p>}
      <fieldset disabled={direct} className="search-filters"><legend>Affiner la liste</legend>
        <label>Territoire<select value={filters.territory} onChange={e=>update({territory:e.target.value as CompanySearch['territory']})}>{Object.entries(territories).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <label>Secteur déclaré<select value={filters.sector} onChange={e=>update({sector:e.target.value as CompanySearch['sector']})}>{Object.entries(sectors).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        <label>Effectif de l’entreprise<select value={filters.size} onChange={e=>update({size:e.target.value as CompanySearch['size']})}>{Object.entries(sizes).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
      </fieldset><p className="note">Le territoire concerne les établissements. L’activité et l’effectif concernent l’entreprise entière. La recherche par nom vise la dénomination officielle. Un filtre d’effectif exclut les valeurs inconnues.</p>
      <button type="submit" className="primary" disabled={busy||waiting}>{busy?"Recherche en cours…":waiting?"Veuillez patienter avant de réessayer":"Rechercher dans Sirene"}</button>
    </form>
    <div aria-live="polite" aria-busy={busy}>{error&&<p role="alert" className="notice">{error}</p>}{busy&&<p className="note">Consultation de la source officielle…</p>}
    {result&&<div className="search-results"><div className="result-heading"><h2>{result.companies.length} profil{result.companies.length!==1?"s":""} affiché{result.companies.length!==1?"s":""}</h2><p className="note">Page {result.page} · {result.totalResults.toLocaleString("fr-FR")} établissement{result.totalResults!==1?"s":""} trouvé{result.totalResults!==1?"s":""} dans Sirene</p></div>
      {result.omitted>0&&<p className="note">{result.omitted} résultat(s) non affiché(s). {result.omittedReasons && `${result.omittedReasons.duplicates} doublon(s), ${result.omittedReasons.ineligible} entité(s) hors périmètre ou inactive(s), ${result.omittedReasons.filters} hors critères, ${result.omittedReasons.identity} identité(s) non exploitable(s).`}</p>}
      {result.totalResults > 1000 && <p className="notice">Les 1 000 premiers établissements sont accessibles ici. Affinez vos critères pour cibler davantage la liste.</p>}
      {feedback && <p role="status" className="notice">{feedback}</p>}
      {!result.companies.length&&<p>Aucune entreprise affichable sur cette page. Essayez un autre nom, élargissez les filtres ou consultez la page suivante.</p>}
      {result.companies.map(c=><article className="directory-result" key={c.siren}><h2>{c.name}</h2><p className="note">SIREN {c.siren} · APE {c.activityCode||"non renseigné"}</p><dl><dt>Siège</dt><dd>{c.headOffice||"Siège non identifié dans cet établissement"}</dd><dt>{!result.directLookup&&submitted?.territory!=="france"?"Établissement dans la zone":"Établissement consulté"}</dt><dd>{c.localAddress||"Adresse locale non confirmée dans la réponse"}{c.localSiret&&<small> · SIRET {c.localSiret}</small>}</dd><dt>Effectif de l’entreprise</dt><dd>{c.workforce}{c.workforceYear?` (donnée ${c.workforceYear})`:" · année non renseignée"}</dd><dt>Création</dt><dd>{c.createdAt||"Date non renseignée"}</dd></dl><div>{!!c.warnings?.length && <ul className="note">{c.warnings.map(w => <li key={w}>{w}</li>)}</ul>}</div><div className="result-actions"><a href={c.officialUrl} target="_blank" rel="noreferrer">Fiche dans l’Annuaire ↗</a><button onClick={()=>{onAdd(c);setFeedback(addedSirens.includes(c.siren)?`${c.name} : données Sirene actualisées, notes et brouillons conservés.`:`${c.name} ajouté à découvrir.`);}}>{addedSirens.includes(c.siren)?"Actualiser les données Sirene":"Ajouter à découvrir"}</button></div></article>)}
      <div className="pagination"><button disabled={busy||waiting||result.page<=1} onClick={()=>submitted&&void run({...submitted,page:result.page-1})}>Page précédente</button><span>{result.page} / {Math.max(1,result.totalPages)}</span><button disabled={busy||waiting||result.page>=result.totalPages} onClick={()=>submitted&&void run({...submitted,page:result.page+1})}>Page suivante</button></div>
      <p className="note">Source : API Sirene de l’Insee · consultée le {new Date(result.consultedAt).toLocaleString("fr-FR")}. Sociétés et entreprises individuelles actives ; associations et administrations écartées. Un code APE ne décrit pas toute l’activité. Le filtrage par secteur utilise la nomenclature NAF rév. 2 et devra être adapté au changement prévu en 2027. Un même SIREN peut apparaître sur plusieurs pages ; l’ajout met à jour la fiche existante. L’ordre est stabilisé pour la pagination, mais le répertoire peut évoluer entre deux recherches. Aucun besoin de recrutement n’est déduit.</p>
    </div>}</div>
  </section>;
}
