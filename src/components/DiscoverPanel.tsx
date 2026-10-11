"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoveryCandidate, DiscoveryPage } from "@/lib/discovery";

export function DiscoverPanel({ profileReady }: { profileReady: boolean }) {
  const router = useRouter();
  const [results, setResults] = useState<DiscoveryPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [existingRun, setExistingRun] = useState<string | null>(null);

  async function search(page: number) {
    setBusy(true); setError(""); setExistingRun(null);
    try {
      const response = await fetch(`/api/discovery?page=${page}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recherche indisponible.");
      setResults(data as DiscoveryPage);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Recherche indisponible."); }
    finally { setBusy(false); }
  }

  async function select(candidate: DiscoveryCandidate) {
    setSelected(candidate.siren); setError(""); setExistingRun(null);
    try {
      const response = await fetch("/api/tests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual", name: candidate.name, url: candidate.officialUrl,
          location: candidate.address, activity: candidate.activityCode ? `Code d’activité ${candidate.activityCode} — activité réelle à vérifier` : "",
          summary: `Association active avec une implantation dans Lyon selon l’annuaire public. SIREN ${candidate.siren}. Aucun besoin numérique n’est établi à ce stade.`,
          sourceNote: `Source : API Recherche d’entreprises (annuaire public), fiche ${candidate.officialUrl}. Données à recouper avec le site et les autres sources de l’association.`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.duplicates?.[0]?.previousRunId) setExistingRun(data.duplicates[0].previousRunId);
        throw new Error(data.error || "Ajout impossible.");
      }
      router.push(`/tests/${data.runs[0].id}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Ajout impossible."); }
    finally { setSelected(""); }
  }

  return <section className="panel discovery-panel" id="decouvrir" aria-labelledby="discover-heading">
    <div className="panel-heading"><div><p className="section-index">Découverte</p><h2 id="discover-heading">Trouver des associations à Lyon</h2></div><span className="version">Tous secteurs</span></div>
    <p className="panel-intro">Associations actives ayant une implantation dans les neuf arrondissements de Lyon, d’après l’annuaire public. Cette liste ne prouve pas qu’elles ont besoin d’une prestation : ouvrez une fiche pour enquêter avant toute approche.</p>
    <div className="form-footer"><button type="button" className="primary-button" disabled={busy} onClick={() => void search(1)}>{busy && !results ? "Recherche…" : "Chercher des associations"}</button>{!profileReady && <span className="field-help">Enregistrez votre ciblage avant de créer une fiche.</span>}</div>
    {error && <p className="warning" role="alert">{error} {existingRun && <a href={`/tests/${existingRun}`}>Ouvrir la fiche existante</a>}</p>}
    {results && <>
      <p className="discovery-meta">{results.totalResults.toLocaleString("fr-FR")} résultats annoncés par l’annuaire · page {results.page} sur {results.totalPages}. L’annuaire répertorie des structures, pas leurs besoins. <a href="https://recherche-entreprises.api.gouv.fr" target="_blank" rel="noreferrer">Voir la source</a></p>
      {results.candidates.length ? <div className="candidate-list">{results.candidates.map(candidate => <article className="candidate" key={candidate.siren}>
        <div><h3>{candidate.name}</h3><p>{candidate.address}</p><small>SIREN {candidate.siren}{candidate.activityCode ? ` · activité ${candidate.activityCode}` : ""}</small></div>
        <div className="candidate-actions"><a href={candidate.officialUrl} target="_blank" rel="noreferrer">Fiche officielle ↗</a><button type="button" className="secondary-button" disabled={!profileReady || !!selected} onClick={() => void select(candidate)}>{selected === candidate.siren ? "Ouverture…" : "Examiner"}</button></div>
      </article>)}</div> : <p className="quiet">Aucun résultat sur cette page.</p>}
      <div className="discovery-pagination"><button type="button" className="secondary-button" disabled={busy || results.page <= 1} onClick={() => void search(results.page - 1)}>Page précédente</button><button type="button" className="secondary-button" disabled={busy || results.page >= results.totalPages || results.page >= 1000} onClick={() => void search(results.page + 1)}>{busy ? "Recherche…" : "Page suivante"}</button></div>
    </>}
  </section>;
}
