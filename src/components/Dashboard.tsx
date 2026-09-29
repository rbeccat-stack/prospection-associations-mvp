"use client";

import Link from "next/link";
import { useState } from "react";
import { defaultProfile, listFromText, type TargetingProfile } from "@/lib/schemas";
import type { DuplicateMatch, StoredProfile, StoredRun } from "@/lib/store";

import type { ServiceStatus } from "@/lib/services";

type InputMode = "url" | "manual" | "csv";
type Preview = { rows: { label: string; type: InputMode; url: string | null }[]; duplicates: DuplicateMatch[] };
type FormInput = { name: string; url: string; location: string; activity: string; summary: string; sourceNote: string; csvText: string };
const emptyInput: FormInput = { name: "", url: "", location: "", activity: "", summary: "", sourceNote: "", csvText: "" };

const fields: { key: keyof Pick<TargetingProfile, "regions" | "associationTypes" | "themes" | "needsSignals" | "exclusions">; label: string; hint: string }[] = [
  { key: "regions", label: "Zones géographiques", hint: "ex. Bretagne, Paris" },
  { key: "associationTypes", label: "Types d’associations", hint: "ex. fédération, association locale" },
  { key: "themes", label: "Thématiques", hint: "ex. culture, insertion" },
  { key: "needsSignals", label: "Signaux recherchés", hint: "ex. site ancien, recrutement" },
  { key: "exclusions", label: "À exclure", hint: "ex. déjà contactée" },
];

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await response.json();
  if (!response.ok) {
    const error = new Error(json.error || "Enregistrement impossible") as Error & { duplicates?: DuplicateMatch[] };
    error.duplicates = json.duplicates;
    throw error;
  }
  return json as T;
}

export function Dashboard({ initialProfile, initialRuns, services }: { initialProfile: StoredProfile | null; initialRuns: StoredRun[]; services: ServiceStatus }) {
  const [profile, setProfile] = useState(initialProfile);
  const [criteria, setCriteria] = useState<TargetingProfile>(initialProfile?.criteria || defaultProfile);
  const [listDraft, setListDraft] = useState(() => ({
    regions: (initialProfile?.criteria || defaultProfile).regions.join(", "),
    associationTypes: (initialProfile?.criteria || defaultProfile).associationTypes.join(", "),
    themes: (initialProfile?.criteria || defaultProfile).themes.join(", "),
    needsSignals: (initialProfile?.criteria || defaultProfile).needsSignals.join(", "),
    exclusions: (initialProfile?.criteria || defaultProfile).exclusions.join(", "),
  }));
  const [runs, setRuns] = useState(initialRuns);
  const [mode, setMode] = useState<InputMode>("url");
  const [input, setInput] = useState<FormInput>(emptyInput);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [busy, setBusy] = useState<"profile" | "preview" | "create" | null>(null);

  function updateCriteria<K extends keyof TargetingProfile>(key: K, value: TargetingProfile[K]) {
    setCriteria((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
  }
  function updateListDraft(key: keyof typeof listDraft, value: string) {
    setListDraft((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
  }
  function updateInput(key: keyof FormInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
    setPreview(null);
    setInputMessage("");
  }
  function submission() {
    if (mode === "csv") return { mode, csvText: input.csvText };
    if (mode === "url") return { mode, url: input.url, name: input.name };
    return { mode, name: input.name, url: input.url, location: input.location, activity: input.activity, summary: input.summary, sourceNote: input.sourceNote };
  }
  async function saveCriteria(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile"); setProfileMessage("");
    try {
      const nextCriteria = { ...criteria, ...Object.fromEntries(Object.entries(listDraft).map(([key, value]) => [key, listFromText(value)])) } as TargetingProfile;
      const result = await postJson<{ profile: StoredProfile }>("/api/profile", nextCriteria);
      setCriteria(nextCriteria);
      setProfile(result.profile);
      setProfileMessage(`Ciblage enregistré · version ${result.profile.version}`);
    } catch (error) { setProfileMessage(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setBusy(null); }
  }
  async function previewInput(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("preview"); setInputMessage(""); setPreview(null);
    try { setPreview(await postJson<Preview>("/api/tests/preview", submission())); }
    catch (error) { setInputMessage(error instanceof Error ? error.message : "Prévisualisation impossible"); }
    finally { setBusy(null); }
  }
  async function createTests(allowDuplicates: boolean) {
    setBusy("create"); setInputMessage("");
    try {
      const result = await postJson<{ runs: StoredRun[] }>("/api/tests", { ...submission(), allowDuplicates });
      setRuns((current) => [...result.runs, ...current].slice(0, 50));
      setPreview(null);
      setInput(emptyInput);
      setInputMessage(`${result.runs.length} test${result.runs.length > 1 ? "s" : ""} enregistré${result.runs.length > 1 ? "s" : ""}.`);
    } catch (error) {
      const failure = error as Error & { duplicates?: DuplicateMatch[] };
      if (failure.duplicates && preview) setPreview({ ...preview, duplicates: failure.duplicates });
      setInputMessage(failure.message || "Création impossible");
    } finally { setBusy(null); }
  }

  return <div className="app-shell">
    <aside className="side-rail"><div className="brand"><span className="brand-mark">d.</span><div><strong>Dossier du jour</strong><small>Associations</small></div></div><nav aria-label="Sections"><a href="#ciblage">Ciblage</a><a href="#nouveau-test">Nouveau test</a><a href="#historique">Historique</a></nav><div className="rail-note"><span className="rail-dot" /> Espace privé<p>Collecte et envoi sur votre action</p></div></aside>
    <main className="workbench">
      <header className="masthead"><div><p className="kicker">Espace de travail personnel</p><h1>Préparer de meilleurs dossiers d’association.</h1><p className="lead">Ajoutez une association, consultez ses sources et préparez une fiche. Relisez le brouillon puis recevez le dossier sur votre adresse personnelle.</p></div><div className="masthead-side"><span className="stage-pill">V0</span><strong>{runs.length}</strong><span>test{runs.length > 1 ? "s" : ""} enregistré{runs.length > 1 ? "s" : ""}</span></div></header>
      <section className="service-status" aria-label="État des services"><p><strong>Analyse IA :</strong> {services.aiReady ? `${services.aiModel} · prête` : "à connecter"}</p><p><strong>E-mail de test :</strong> {services.mailReady ? `prêt pour ${services.recipient}` : "à connecter"}</p><p className="field-help">La collecte, les corrections et les prévisualisations sont disponibles. Les connexions se configurent côté serveur selon CONFIGURATION.md.</p></section><div className="workspace-grid">
        <section className="panel profile-panel" id="ciblage"><div className="panel-heading"><div><p className="section-index">Étape 1</p><h2>Votre ciblage</h2></div><span className="version">{profile ? `Version ${profile.version}` : "À définir"}</span></div><p className="panel-intro">Les champs laissés vides n’ajoutent aucun filtre. Chaque test conserve une copie de la version utilisée.</p>
          <form onSubmit={saveCriteria} className="form-stack">
            <label>Nom du ciblage<input required maxLength={80} value={criteria.name} onChange={(e) => updateCriteria("name", e.target.value)} /></label>
            <div className="two-col">{fields.slice(0, 2).map((field) => <label key={field.key}>{field.label}<input placeholder={field.hint} value={listDraft[field.key]} onChange={(e) => updateListDraft(field.key, e.target.value)} /></label>)}</div>
            <label>Thématiques<input placeholder="ex. culture, insertion" value={listDraft.themes} onChange={(e) => updateListDraft("themes", e.target.value)} /></label>
            <div className="two-col"><label>Taille souhaitée<input placeholder="ex. 5 à 30 salariés" value={criteria.sizePreference} onChange={(e) => updateCriteria("sizePreference", e.target.value)} /></label><label>Maturité digitale<input placeholder="ex. présence web limitée" value={criteria.digitalMaturity} onChange={(e) => updateCriteria("digitalMaturity", e.target.value)} /></label></div>
            {fields.slice(3).map((field) => <label key={field.key}>{field.label}<input placeholder={field.hint} value={listDraft[field.key]} onChange={(e) => updateListDraft(field.key, e.target.value)} /></label>)}
            <label>Votre offre<textarea rows={3} maxLength={2000} placeholder="Ce que vous proposez concrètement aux associations" value={criteria.offer} onChange={(e) => updateCriteria("offer", e.target.value)} /></label><label>Ton de l’approche<input placeholder="ex. direct, attentif, concret" value={criteria.tone} onChange={(e) => updateCriteria("tone", e.target.value)} /></label>
            <div className="form-footer"><button type="submit" className="primary-button" disabled={busy !== null}>{busy === "profile" ? "Enregistrement…" : "Enregistrer le ciblage"}</button><p role="status" className="form-message">{profileMessage}</p></div>
          </form>
        </section>
        <section className="panel intake-panel" id="nouveau-test"><div className="panel-heading"><div><p className="section-index">Étape 2</p><h2>Ajouter une association</h2></div></div><p className="panel-intro">Créez le test, puis ouvrez sa fiche pour collecter les pages et préparer le dossier.</p>
          <div className="mode-tabs" role="tablist" aria-label="Type d’entrée">{(["url", "manual", "csv"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={mode === value} className={mode === value ? "active" : ""} onClick={() => { setMode(value); setPreview(null); setInputMessage(""); }}>{value === "url" ? "URL" : value === "manual" ? "Saisie" : "CSV"}</button>)}</div>
          <form onSubmit={previewInput} className="form-stack intake-form">
            {mode === "url" && <><label>URL de l’association<input required type="url" placeholder="https://association.fr" value={input.url} onChange={(e) => updateInput("url", e.target.value)} /></label><label>Nom, si connu<input placeholder="Facultatif" value={input.name} onChange={(e) => updateInput("name", e.target.value)} /></label></>}
            {mode === "manual" && <><label>Nom de l’association<input required value={input.name} onChange={(e) => updateInput("name", e.target.value)} /></label><label>Site ou page source<input type="url" placeholder="https://… (facultatif)" value={input.url} onChange={(e) => updateInput("url", e.target.value)} /></label><div className="two-col"><label>Localisation<input value={input.location} onChange={(e) => updateInput("location", e.target.value)} /></label><label>Activité<input value={input.activity} onChange={(e) => updateInput("activity", e.target.value)} /></label></div><label>Résumé saisi<textarea rows={3} value={input.summary} onChange={(e) => updateInput("summary", e.target.value)} /></label><label>Note sur la source<textarea rows={2} placeholder="D’où viennent ces informations ?" value={input.sourceNote} onChange={(e) => updateInput("sourceNote", e.target.value)} /></label></>}
            {mode === "csv" && <><label>Contenu CSV<textarea required rows={8} spellCheck={false} placeholder={'nom,url,localisation,activite,resume,source\nAssociation exemple,https://exemple.fr,Lyon,Culture,,Page fournie manuellement'} value={input.csvText} onChange={(e) => updateInput("csvText", e.target.value)} /></label><p className="field-help">Colonnes : nom (obligatoire), url, localisation, activite, resume, source. Dix lignes maximum.</p></>}
            <div className="form-footer"><button type="submit" className="secondary-button" disabled={busy !== null || !profile}>{busy === "preview" ? "Vérification…" : "Vérifier l’entrée"}</button>{!profile && <span className="field-help">Enregistrez d’abord le ciblage.</span>}</div>
          </form>
          {preview && <div className="preview-box"><h3>Avant d’enregistrer</h3><ul>{preview.rows.map((row, index) => <li key={index}><strong>{row.label}</strong><span>{row.url || "Sans URL"}</span>{preview.duplicates.some((match) => match.index === index) && <em>Déjà examiné</em>}</li>)}</ul>{preview.duplicates.length > 0 && <p className="warning">{preview.duplicates.length} doublon{preview.duplicates.length > 1 ? "s" : ""} détecté{preview.duplicates.length > 1 ? "s" : ""}. Un nouveau test conservera les précédents.</p>}<button type="button" className="primary-button" disabled={busy !== null} onClick={() => createTests(preview.duplicates.length > 0)}>{busy === "create" ? "Enregistrement…" : preview.duplicates.length ? "Créer malgré les doublons" : preview.rows.length > 1 ? `Lancer ${preview.rows.length} tests` : "Lancer un test"}</button></div>}
          <p role="status" className="form-message">{inputMessage}</p>
        </section>
      </div>
      <section className="history" id="historique"><div className="history-head"><div><p className="section-index">Étape 3</p><h2>Historique des tests</h2></div><span>{runs.length} affiché{runs.length > 1 ? "s" : ""}</span></div>{runs.length ? <div className="history-list">{runs.map((run) => <Link className="history-row" href={`/tests/${run.id}`} key={run.id}><div className="history-name"><strong>{run.label}</strong><small>{run.inputType === "url" ? "URL" : run.inputType === "csv" ? "CSV" : "Saisie manuelle"} · Ciblage v{run.profileVersion}{run.deliveryState ? ` · E-mail : ${{ accepted: "accepté, réception à confirmer", received: "reçu", failed: "échec", uncertain: "à vérifier", sending: "en cours" }[run.deliveryState] || run.deliveryState}` : ""}</small></div><span className="history-date">{new Date(run.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span><span className="history-status">{run.workflowState === "failed" ? "À reprendre" : run.dossierReady ? "Fiche prête" : run.workflowState === "collected" ? "Sources prêtes" : "À analyser"}</span><span className="history-open" aria-hidden="true">↗</span></Link>)}</div> : <div className="empty-state"><strong>Aucun test pour le moment</strong><p>Enregistrez votre ciblage, puis ajoutez une association pour commencer l’historique.</p></div>}</section>
      <footer className="footer-note">Les dossiers et leurs versions sont conservés dans votre base privée.</footer>
    </main>
  </div>;
}
