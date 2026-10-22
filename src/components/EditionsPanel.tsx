"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CandidateState, EditionState, EditionView } from "@/lib/engine";

const candidateLabels: Record<CandidateState, string> = {
  pending: "En attente", collected: "Site lu", ready: "Dossier prêt", research: "Retour en recherche",
  skipped: "Site illisible", failed: "Analyse rejetée", unused: "Non examinée",
};
const editionLabels: Record<EditionState, string> = { running: "En cours", paused: "En pause", complete: "Terminée" };

async function postJson(path: string, payload: unknown): Promise<{ edition: EditionView }> {
  let response: Response;
  try { response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
  catch { throw new Error("Connexion au serveur interrompue. Vérifiez votre réseau puis reprenez l’édition."); }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Action impossible.");
  return json;
}

function cost(edition: EditionView) {
  return edition.cost === null ? "coût non communiqué" : `coût ≈ ${edition.cost.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} $`;
}
function readyCount(edition: EditionView) {
  return edition.candidates.filter(candidate => candidate.state === "ready").length;
}

export function EditionsPanel({ initialEditions, aiReady }: { initialEditions: EditionView[]; aiReady: boolean }) {
  const [editions, setEditions] = useState(initialEditions);
  const [looping, setLooping] = useState(false);
  const [busy, setBusy] = useState<"start" | "close" | null>(null);
  const [error, setError] = useState("");
  const stop = useRef(false);
  const current = editions[0];

  function replace(edition: EditionView) {
    setEditions(list => [edition, ...list.filter(item => item.id !== edition.id)].slice(0, 5));
  }
  async function loop(id: string) {
    stop.current = false; setLooping(true); setError("");
    try {
      while (!stop.current) {
        const { edition } = await postJson(`/api/editions/${id}`, { action: "step" });
        replace(edition);
        if (edition.state !== "running") break;
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Étape impossible."); }
    finally { setLooping(false); }
  }
  async function start() {
    setBusy("start"); setError("");
    try {
      const { edition } = await postJson("/api/editions", {});
      replace(edition);
      setBusy(null);
      await loop(edition.id);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Lancement impossible."); }
    finally { setBusy(null); }
  }
  async function close(id: string) {
    setBusy("close"); setError("");
    try { replace((await postJson(`/api/editions/${id}`, { action: "close" })).edition); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Clôture impossible."); }
    finally { setBusy(null); }
  }

  const active = current && current.state !== "complete";
  const working = current?.candidates.find(candidate => candidate.state === "pending" || candidate.state === "collected");

  return <section className="panel editions-panel" id="editions" aria-labelledby="editions-heading">
    <div className="panel-heading"><div><p className="section-index">Moteur · preuve</p><h2 id="editions-heading">Éditions préparées</h2></div><span className="version">5 analyses IA maximum</span></div>
    <p className="panel-intro">Chaque édition tire au sort une catégorie du Journal officiel des associations, parmi les associations lyonnaises qui y déclarent un site. Le moteur lit ce site et ses pages clés, puis prépare jusqu’à cinq dossiers. Un site illisible est écarté sans appel IA. Gardez cette page ouverte pendant la préparation : une étape dure de quelques secondes à une minute et demie.</p>
    {!aiReady && <p className="field-help">L’analyse IA n’est pas configurée sur ce serveur : l’édition lira les sites puis se mettra en pause avant toute analyse.</p>}
    <div className="form-footer">
      <button type="button" className="primary-button" disabled={looping || busy !== null || current?.state === "running"} onClick={() => void start()}>{busy === "start" ? "Tirage de la catégorie…" : "Lancer une édition"}</button>
      {active && !looping && <button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void loop(current.id)}>Reprendre l’édition</button>}
      {looping && <button type="button" className="secondary-button" onClick={() => { stop.current = true; }}>Mettre en pause après cette étape</button>}
      {active && !looping && <button type="button" className="text-button" disabled={busy !== null} onClick={() => void close(current.id)}>{busy === "close" ? "Clôture…" : "Clore l’édition"}</button>}
    </div>
    {error && <p className="warning" role="alert">{error}</p>}
    {current && <article className="edition-current" aria-live="polite">
      <header className="edition-head">
        <div><p className="quiet">Catégorie tirée au sort · {new Date(current.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p><h3>{current.domainLabel}</h3>{current.domainFamily && <p className="quiet">{current.domainFamily}</p>}</div>
        <dl className="edition-metrics"><div><dt>État</dt><dd>{looping ? "Préparation…" : editionLabels[current.state]}</dd></div><div><dt>Analyses IA</dt><dd>{current.analysesUsed} / {current.maxAnalyses}</dd></div><div><dt>Dossiers prêts</dt><dd>{readyCount(current)}</dd></div><div><dt>Dépense</dt><dd>{cost(current)}</dd></div></dl>
      </header>
      {current.error && <p className="warning">{current.error}</p>}
      {looping && working && <p className="field-help">Étape en cours : {working.state === "pending" ? "lecture du site" : "analyse IA"} de {working.name}.</p>}
      <ol className="edition-candidates">{current.candidates.map(candidate => <li key={candidate.id} className={`edition-candidate is-${candidate.state}`}>
        <div><strong>{candidate.name}</strong><a href={candidate.website} target="_blank" rel="noreferrer">{candidate.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</a>{candidate.reason && <small>{candidate.reason}</small>}</div>
        <div className="edition-candidate-side"><span className="edition-badge">{candidateLabels[candidate.state]}</span>{candidate.runId && ["ready", "research", "failed"].includes(candidate.state) && <Link href={`/tests/${candidate.runId}`}>Ouvrir le dossier</Link>}</div>
      </li>)}</ol>
    </article>}
    {editions.length > 1 && <details className="edition-history"><summary>Éditions précédentes</summary><ul>{editions.slice(1).map(edition => <li key={edition.id}><span>{new Date(edition.createdAt).toLocaleDateString("fr-FR")}</span><strong>{edition.domainLabel}</strong><span>{readyCount(edition)} prêt{readyCount(edition) > 1 ? "s" : ""} · {edition.analysesUsed} analyse{edition.analysesUsed > 1 ? "s" : ""} · {cost(edition)} · {editionLabels[edition.state]}</span></li>)}</ul></details>}
  </section>;
}
