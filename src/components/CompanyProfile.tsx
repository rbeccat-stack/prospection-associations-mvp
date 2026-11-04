"use client";

import { useCallback, useState } from "react";
import CompanyEditor from "./CompanyEditor";
import CompanyEnrichment from "./CompanyEnrichment";
import type { CompanyEnrichment as EnrichmentSnapshot } from "@/lib/company-enrichment-shared";
import { type Company, type CompanyEditable, isPublicWebUrl } from "@/lib/company-records";

export default function CompanyProfile({ company, onSave, onEnrich, onDirtyChange }: { company: Company; onSave: (changes: CompanyEditable) => void; onEnrich: (result: EnrichmentSnapshot) => void; onDirtyChange: (dirty: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [enrichmentDirty, setEnrichmentDirty] = useState(false);
  const webDirty = useCallback((dirty: boolean) => { setEnrichmentDirty(dirty); onDirtyChange(dirty); }, [onDirtyChange]);
  const d = company.directory;
  return <>
    <div className="profile-heading"><div><h1>{company.name}</h1><p className="muted">{company.sector || "Secteur à compléter"} · {company.city || "Localisation à compléter"}</p></div>{!editing && <button onClick={() => { if (!enrichmentDirty || window.confirm("Abandonner l’enrichissement non enregistré pour modifier la fiche ?")) setEditing(true); }}>Modifier la fiche</button>}</div>
    {editing ? <CompanyEditor initial={company} onDirtyChange={onDirtyChange} onCancel={() => setEditing(false)} onSave={changes => { onSave(changes); setEditing(false); }} /> : <>
      <p className="lead">{company.description || "Activité à approfondir à partir du site de l’entreprise."}</p>
      <div className="rule" /><h2>Faits et signaux observés</h2><p className="profile-text">{company.signal || "Aucune observation renseignée pour le moment."}</p>
      {company.sources.length ? <ul className="profile-sources">{company.sources.map(source => <li key={source.id}><a className="source" href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><small>{source.consultedOn ? `Consultée le ${new Date(`${source.consultedOn}T12:00:00`).toLocaleDateString("fr-FR")}` : "Date de consultation non renseignée"}</small></li>)}</ul> : <p className="note">Ajoutez des sources pour documenter vos observations.</p>}
      <h2>Une piste à explorer</h2><p className="profile-text">{company.idea || "Aucune piste renseignée. Recherchez des informations fiables avant de rédiger."}</p><p className="note">Une piste est une hypothèse : elle ne prouve pas un besoin ni un recrutement.</p>
      <h2>Notes personnelles</h2><p className="profile-text">{company.notes || "Aucune note pour le moment."}</p>
      {company.email && <p className="note">Contact à vérifier : {company.email}</p>}
      {company.updatedAt && <p className="note">Fiche modifiée le {new Date(company.updatedAt).toLocaleString("fr-FR")}</p>}
      <CompanyEnrichment company={company} onSave={onEnrich} onDirtyChange={webDirty} />
    </>}
    {d && <details className="sirene-snapshot" open><summary>Données officielles Sirene</summary><p className="note">Instantané consulté le {new Date(d.consultedAt).toLocaleString("fr-FR")}. Une actualisation depuis la recherche conserve vos notes, vos sources et vos brouillons.</p><dl>
      <dt>Dénomination</dt><dd>{d.name}</dd><dt>SIREN</dt><dd>{d.siren}</dd><dt>Code APE</dt><dd>{d.activityCode || "Non renseigné"}</dd>
      <dt>Siège</dt><dd>{d.headOffice || "Siège non identifié dans cet établissement"}</dd><dt>Établissement consulté</dt><dd>{d.localAddress || "Adresse non renseignée"}{d.localSiret && <small>SIRET {d.localSiret}</small>}</dd>
      <dt>Effectif de l’entreprise</dt><dd>{d.workforce}{d.workforceYear ? ` (donnée ${d.workforceYear})` : " · année non renseignée"}</dd><dt>Création</dt><dd>{d.createdAt || "Non renseignée"}</dd>
    </dl>{!!d.warnings?.length && <ul className="note">{d.warnings.map(w => <li key={w}>{w}</li>)}</ul>}{isPublicWebUrl(d.officialUrl) && <a className="source" href={d.officialUrl} target="_blank" rel="noreferrer">Consulter la fiche dans l’Annuaire ↗</a>}</details>}
  </>;
}
