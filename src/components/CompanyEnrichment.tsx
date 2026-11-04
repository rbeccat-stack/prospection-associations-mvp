"use client";

import { useEffect, useRef, useState } from "react";
import { canAcceptEnrichment, enrichmentInputSchema, enrichmentSchema, type CompanyEnrichment as Snapshot } from "@/lib/company-enrichment-shared";
import type { Company } from "@/lib/company-records";

function Evidence({ result }: { result: Snapshot }) {
  return <div className="web-evidence">
    <p className="note">{result.identity === "matched" ? "Le SIREN de cette fiche apparaît sur une des pages consultées." : result.identity === "conflict" ? "Les identifiants trouvés ne correspondent pas au SIREN de la fiche. Vérifiez le site et ses mentions légales." : "Le rapprochement avec le SIREN reste à vérifier. Le nom ou le domaine seuls ne prouvent pas l’identité."}</p>
    <ul className="profile-sources">{result.pages.map((page, i) => <li key={`${page.url}-${i}`}>
      <a className="source" href={page.url} target="_blank" rel="noreferrer">{page.title}</a>
      <small>Consultée le {new Date(page.consultedAt).toLocaleString("fr-FR")}{page.publishedOn ? ` · Publication déclarée : ${page.publishedOn}` : " · Date de publication inconnue"}</small>
      {page.status === "available" ? <blockquote>{page.excerpt || "Aucun extrait disponible. Consultez la page."}</blockquote> : <p role="status" className="note">{page.error}</p>}
    </li>)}</ul>
    <p className="note">Extraits du site, à vérifier : ils ne prouvent ni un besoin, ni un recrutement. La consultation ne mesure pas la fraîcheur du contenu. Logo et actualités non fournis restent inconnus.</p>
  </div>;
}

export default function CompanyEnrichment({ company, onSave, onDirtyChange }: { company: Company; onSave: (result: Snapshot) => void; onDirtyChange: (dirty: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState(company.enrichment?.website || "");
  const [pages, setPages] = useState(company.enrichment?.pages.slice(1).map(p => p.url).join("\n") || "");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { onDirtyChange(open && (!!website || !!pages || busy || !!result)); return () => onDirtyChange(false); }, [open, website, pages, busy, result, onDirtyChange]);
  useEffect(() => () => controller.current?.abort(), []);
  const resetPreview = () => { setResult(null); setConfirmed(false); setError(""); };
  const collect = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setResult(null);
    const input = enrichmentInputSchema.safeParse({ siren: company.siren, website: website.trim(), pages: pages.split(/\r?\n/).map(p => p.trim()).filter(Boolean) });
    if (!input.success) { setError(input.error.issues[0]?.message || "Vérifiez les adresses."); return; }
    setBusy(true); const pending = new AbortController(); controller.current = pending;
    try {
      const response = await fetch("/api/companies/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.data), signal: pending.signal });
      const data = await response.json();
      if (controller.current !== pending) return;
      if (!response.ok) { setError(data.error || "Consultation impossible. Réessayez."); return; }
      setResult(enrichmentSchema.parse(data));
    } catch (error) { if (controller.current === pending && !(error instanceof Error && error.name === "AbortError")) setError("Impossible de consulter le site. Vérifiez la connexion et réessayez."); }
    finally { if (controller.current === pending) setBusy(false); }
  };
  return <div className="company-enrichment">
    <h2>Approfondir avec le site de l’entreprise</h2>
    {company.enrichment && !open && <Evidence result={company.enrichment} />}
    {!open ? <><p className="note">Consultez jusqu’à trois pages publiques, puis relisez les extraits avant de les enregistrer.</p><button onClick={() => setOpen(true)}>{company.enrichment ? "Actualiser les sources web" : "Enrichir depuis un site"}</button></> : <form onSubmit={collect} aria-busy={busy}>
      <fieldset disabled={busy} className="enrichment-fields"><legend>Pages à consulter</legend>
        <label>Site de l’entreprise<input required type="url" value={website} placeholder="https://entreprise.fr" onChange={e => { setWebsite(e.target.value); resetPreview(); }} /></label>
        <label>Pages complémentaires, une adresse par ligne<textarea rows={3} value={pages} onChange={e => { setPages(e.target.value); resetPreview(); }} placeholder="https://entreprise.fr/mentions-legales" /><small>Deux pages au maximum, sur le même domaine : mentions légales, activité ou actualité précise.</small></label>
        <label className="enrichment-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />J’ai vérifié que ce site correspond à cette entreprise.</label>
        <div className="editor-actions"><button type="submit" disabled={!confirmed}>{busy ? "Consultation des pages…" : "Consulter ces pages"}</button></div>
      </fieldset>
      {error && <p role="alert" className="notice">{error}</p>}
      {result && <div aria-live="polite"><h3>Aperçu à relire</h3><Evidence result={result} />{canAcceptEnrichment(result) && <button type="button" disabled={!confirmed} className="primary" onClick={() => { onSave(result); setResult(null); setOpen(false); }}>Enregistrer cet enrichissement</button>}</div>}
      <button type="button" className="text-button" onClick={() => { controller.current?.abort(); controller.current = null; setBusy(false); setResult(null); setError(""); setConfirmed(false); setWebsite(company.enrichment?.website || ""); setPages(company.enrichment?.pages.slice(1).map(p => p.url).join("\n") || ""); setOpen(false); }}>Annuler</button>
    </form>}
    <p className="note">Societeinfo : évaluation documentée, connexion en attente. Aucun crédit consommé par ce module.</p>
  </div>;
}
