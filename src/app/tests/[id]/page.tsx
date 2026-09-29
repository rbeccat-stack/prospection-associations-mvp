import Link from "next/link";
import { notFound } from "next/navigation";
import { TestWorkspace } from "@/components/TestWorkspace";
import { collection, workflow, revisions } from "@/lib/workflow";
import { deliveries } from "@/lib/delivery";
import { serviceStatus } from "@/lib/services";
import { getDb, getDossier, getRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function list(values: string[]) { return values.length ? values.join(", ") : "Non renseigné"; }

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const run = getRun(db, id);
  if (!run) notFound();
  const dossier = getDossier(db, id);
  const input = run.input;
  const detail = "location" in input ? input : null;
  const criteria = run.profileSnapshot;

  return <main className="detail-shell">
    <div className="detail-top"><Link href="/" className="text-link">← Retour au tableau de bord</Link><span className="quiet">Test local · {new Date(run.createdAt).toLocaleString("fr-FR")}</span></div>
    <header className="detail-head"><span className="status-tag">{dossier ? "Dossier sourcé" : "En attente d’analyse"}</span><h1>{run.label}</h1><p>{dossier ? "Fiche préparée à partir des sources indiquées. Les faits, hypothèses et réserves restent séparés." : "Cette entrée est enregistrée. Aucune analyse de site ni fiche sourcée n’a encore été produite."}</p></header>
    <TestWorkspace run={run} dossier={dossier} pages={collection(db, id)} work={workflow(db, id)} services={serviceStatus()} history={revisions(db, id)} sent={deliveries(db, id)} />
    <h2 className="original-data-heading">Données du test</h2>
    <div className="detail-grid">
      <section className="panel"><h2>Entrée fournie</h2><dl className="facts"><dt>Mode</dt><dd>{input.type === "url" ? "URL" : input.type === "csv" ? "CSV" : "Saisie manuelle"}</dd><dt>URL</dt><dd>{input.url ? <a href={input.url} target="_blank" rel="noreferrer">{input.url}</a> : "Non renseignée"}</dd><dt>Localisation</dt><dd>{detail?.location || "Non renseignée"}</dd><dt>Activité</dt><dd>{detail?.activity || "Non renseignée"}</dd><dt>Résumé saisi</dt><dd>{detail?.summary || "Non renseigné"}</dd><dt>Note de source</dt><dd>{detail?.sourceNote || "Non renseignée"}</dd></dl></section>
      <section className="panel"><div className="panel-heading"><h2>Ciblage conservé</h2><span className="version">Version {run.profileVersion}</span></div><dl className="facts"><dt>Nom</dt><dd>{criteria.name}</dd><dt>Votre offre</dt><dd>{criteria.offer || "Non renseignée lors de ce test"}</dd><dt>Zones</dt><dd>{list(criteria.regions)}</dd><dt>Types</dt><dd>{list(criteria.associationTypes)}</dd><dt>Thématiques</dt><dd>{list(criteria.themes)}</dd><dt>Taille</dt><dd>{criteria.sizePreference || "Non renseignée"}</dd><dt>Maturité digitale</dt><dd>{criteria.digitalMaturity || "Non renseignée"}</dd><dt>Signaux</dt><dd>{list(criteria.needsSignals)}</dd><dt>Exclusions</dt><dd>{list(criteria.exclusions)}</dd><dt>Ton</dt><dd>{criteria.tone || "Non renseigné"}</dd></dl></section>
    </div>
    <p className="detail-foot">Identifiant du test : <code>{run.id}</code></p>
  </main>;
}
