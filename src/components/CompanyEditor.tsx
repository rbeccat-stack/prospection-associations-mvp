"use client";

import { useEffect, useState } from "react";
import { companyEditableSchema, type CompanyEditable } from "@/lib/company-records";

type Props = { initial: CompanyEditable; onSave: (changes: CompanyEditable) => void; onCancel: () => void; onDirtyChange?: (dirty: boolean) => void; creating?: boolean };
export default function CompanyEditor({ initial, onSave, onCancel, onDirtyChange, creating = false }: Props) {
  const [draft, setDraft] = useState<CompanyEditable>({ ...initial, sources: initial.sources.map(s => ({ ...s })) });
  const [error, setError] = useState("");
  useEffect(() => { onDirtyChange?.(JSON.stringify(draft) !== JSON.stringify(initial)); }, [draft, initial, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const update = (field: keyof CompanyEditable, value: string) => setDraft(s => ({ ...s, [field]: value }));
  return <form className="company-editor" onSubmit={e => {
    e.preventDefault(); const parsed = companyEditableSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Vérifiez les champs du profil."); return; }
    onSave(parsed.data);
  }}>
    <p className="note">Vos informations et vos notes sont indépendantes des données officielles Sirene.</p>
    <div className="editor-fields">
      <label>Nom de l’entreprise<input autoFocus required maxLength={180} value={draft.name} onChange={e => update("name", e.target.value)} /></label>
      <label>Secteur / activité<input maxLength={200} value={draft.sector} onChange={e => update("sector", e.target.value)} /></label>
      <label>Localisation<input maxLength={500} value={draft.city} onChange={e => update("city", e.target.value)} /></label>
      <label>Email de contact à vérifier<input type="email" maxLength={320} value={draft.email} onChange={e => update("email", e.target.value)} /></label>
    </div>
    <label>Que fait cette entreprise ?<textarea rows={4} maxLength={10000} value={draft.description} onChange={e => update("description", e.target.value)} /></label>
    <label>Faits et signaux observés<textarea rows={4} maxLength={10000} value={draft.signal} onChange={e => update("signal", e.target.value)} placeholder="Une annonce, une actualité, une observation vérifiable…" /></label>
    <fieldset className="source-editor"><legend>Sources des observations</legend>
      <p className="note">Ajoutez les liens qui appuient vos observations. Une source ne confirme pas à elle seule un besoin de recrutement.</p>
      {draft.sources.map((source, index) => <div className="source-row" key={source.id}>
        <label>Titre de la source {index + 1}<input required maxLength={180} value={source.label} onChange={e => setDraft(s => ({ ...s, sources: s.sources.map(v => v.id === source.id ? { ...v, label: e.target.value } : v) }))} /></label>
        <label>Adresse du lien<input type="url" required maxLength={2000} value={source.url} placeholder="https://…" onChange={e => setDraft(s => ({ ...s, sources: s.sources.map(v => v.id === source.id ? { ...v, url: e.target.value } : v) }))} /></label>
        <label>Consultée le<input type="date" value={source.consultedOn} onChange={e => setDraft(s => ({ ...s, sources: s.sources.map(v => v.id === source.id ? { ...v, consultedOn: e.target.value } : v) }))} /></label>
        <button type="button" className="text-button" onClick={() => setDraft(s => ({ ...s, sources: s.sources.filter(v => v.id !== source.id) }))}>Retirer la source {index + 1}</button>
      </div>)}
      <button type="button" disabled={draft.sources.length >= 30} onClick={() => setDraft(s => ({ ...s, sources: [...s.sources, { id: crypto.randomUUID(), label: "", url: "", consultedOn: new Date().toISOString().slice(0, 10) }] }))}>Ajouter une source</button>
    </fieldset>
    <label>Piste ou hypothèse à explorer<textarea rows={4} maxLength={10000} value={draft.idea} onChange={e => update("idea", e.target.value)} placeholder="Quelle contribution pourriez-vous proposer ? Qu’est-ce qui reste à vérifier ?" /></label>
    <label>Notes personnelles<textarea rows={5} maxLength={20000} value={draft.notes} onChange={e => update("notes", e.target.value)} placeholder="Questions, recherches à mener, éléments pour préparer l’échange…" /></label>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="editor-actions"><button className="primary" type="submit">{creating ? "Ajouter à découvrir" : "Enregistrer la fiche"}</button><button type="button" onClick={onCancel}>Annuler</button></div>
    <p className="note">Les changements sont conservés après enregistrement. Annuler les abandonne.</p>
  </form>;
}
