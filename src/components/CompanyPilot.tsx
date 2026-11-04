"use client";

import { useEffect, useState } from "react";
import CompanySearchPanel from "./CompanySearchPanel";
import CompanyEditor from "./CompanyEditor";
import CompanyProfile from "./CompanyProfile";
import { emptyCompany, importDirectoryCompany, parsePilotState, saveCompany, saveCompanyEnrichment, type Company, type CompanyEditable, type PilotState as State } from "@/lib/company-records";
import type { CompanyEnrichment } from "@/lib/company-enrichment-shared";
import { enrichmentExamples } from "@/lib/company-pilot-examples";
import type { DirectoryCompany } from "@/lib/company-search-shared";

const sample: Company = { ...emptyCompany, id: "muodim", siren: "901931105", name: "Muodim", sector: "Deeptech · imagerie", city: "Lyon 3e", description: "La muographie révèle des structures et sous-sols difficiles à observer grâce aux muons cosmiques.", signal: "En juillet 2026, Muodim annonce l’arrivée de BRGM Invest et IRIS Instruments à son capital pour accélérer son développement.", source: "https://www.pulsalys.fr/article/muodim-ouvre-son-capital-brgm-invest-et-iris-instruments-pour-accelerer-la-democratisation", idea: "Hypothèse à explorer : expliquer un cas d’usage précis, par exemple l’après-mine, à travers une page destinée à un public clairement identifié. Vérifier sa pertinence avec Muodim avant d’en déduire un besoin.", email: "contact@muodim.com" };
const initial = parsePilotState({ companies: [sample], choices: {}, decisions: {}, subjects: {}, messages: {} });
const key = "swipe-prospect-entreprises-v1";
const template = (c: Company) => `Bonjour,\n\nJ’ai découvert ${c.name} et je me suis intéressé à votre activité.\n\n${c.idea || "J’aimerais vous partager une piste à explorer : [préciser l’idée et le signal qui l’a inspirée]."}\n\nJe travaille sur des sujets de growth, de data et d’automatisation et serais ravi d’échanger sur vos enjeux et la manière dont je pourrais contribuer.\n\nSeriez-vous disponible pour un court échange téléphonique ?\n\nRémi`;

export default function CompanyPilot() {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"discover" | "selected" | "add" | "search">("search");
  const [active, setActive] = useState<string | null>(null);
  const [storageEnabled, setStorageEnabled] = useState(true);
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const canLeave = () => !dirty || window.confirm("La fiche contient des modifications non enregistrées. Les abandonner ?");
  const navigate = (next: typeof view) => { if (canLeave()) { setView(next); setActive(null); } };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { setState(parsePilotState(JSON.parse(raw))); }
        catch {
          // Preserve the original rather than overwrite an unreadable selection.
          try { localStorage.setItem(`${key}-recovery-${Date.now()}`, raw); }
          catch { setStorageEnabled(false); }
          setNotice("Votre sélection enregistrée est illisible. Une copie de récupération est conservée si le navigateur le permet. L’exemple est affiché.");
        }
      }
    } catch { setStorageEnabled(false); setNotice("Le stockage de ce navigateur est inaccessible. Vos changements ne seront pas conservés après fermeture."); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready && storageEnabled) { try { localStorage.setItem(key, JSON.stringify(state)); } catch { setNotice("Enregistrement impossible dans ce navigateur. Copiez vos textes avant de quitter."); } } }, [state, ready, storageEnabled]);
  const pending = state.companies.filter(c => !state.choices[c.id]);
  const kept = state.companies.filter(c => state.choices[c.id] === "keep");
  const company = state.companies.find(c => c.id === active);
  const choose = (id: string, choice: "keep" | "pass") => setState(s => ({ ...s, choices: { ...s.choices, [id]: choice } }));
  const add = (changes: CompanyEditable) => {
    const c: Company = { ...changes, id: crypto.randomUUID(), source: "", updatedAt: new Date().toISOString() };
    setState(s => ({ ...s, companies: [...s.companies, c] })); setView("discover"); setActive(c.id);
    setNotice("Entreprise ajoutée à vos profils à découvrir.");
  };
  const addedSirens = state.companies.map(c => c.siren || "").filter(Boolean);
  const importCompany = (record: DirectoryCompany) => {
    const exists = addedSirens.includes(record.siren);
    setState(s => importDirectoryCompany(s, record));
    setNotice(exists ? "Données Sirene actualisées. Vos informations personnelles et vos brouillons sont conservés." : `${record.name} a été ajouté à vos profils à découvrir.`);
  };
  const editCompany = (changes: CompanyEditable) => {
    if (!company) return;
    setState(s => ({ ...s, companies: s.companies.map(c => c.id === company.id ? saveCompany(c, changes) : c) }));
    setNotice("Fiche mise à jour.");
  };
  const enrich = (result: CompanyEnrichment) => {
    if (!company) return;
    setState(s => ({ ...s, companies: s.companies.map(c => c.id === company.id ? saveCompanyEnrichment(c, result) : c) }));
    setNotice("Sources web enregistrées. Vos notes, données Sirene et brouillons sont conservés.");
  };
  const openExample = (example: Company) => {
    if (!canLeave()) return;
    const existing = state.companies.find(c => c.siren === example.siren);
    if (!existing) setState(s => ({ ...s, companies: [...s.companies, example] }));
    setView("discover"); setActive(existing?.id || example.id);
    setNotice(existing ? "Fiche existante ouverte ; vos informations sont conservées." : "Exemple documenté ajouté. Les pistes proposées restent à valider.");
  };
  const subject = company ? state.subjects[company.id] ?? `Une idée pour ${company.name}` : "";
  const message = company ? state.messages[company.id] ?? template(company) : "";
  const [recipient, setRecipient] = useState("");
  useEffect(() => { setRecipient(company?.email ?? ""); }, [company?.id, company?.email]);
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  if (!ready) return <main className="pilot"><p>Ouverture de votre sélection…</p></main>;
  return <main className="pilot"><div className="pilot-shell">
    <header className="pilot-header"><a className="brand" href="/">swipe<span> / </span>prospect</a><span className="private">Espace personnel</span></header>
    <nav className="pilot-nav" aria-label="Navigation"><button className={view === "search" && !active ? "current" : ""} onClick={() => navigate("search")}>Rechercher</button><button className={view === "discover" ? "current" : ""} onClick={() => navigate("discover")}>À découvrir <span>{pending.length}</span></button><button className={view === "selected" ? "current" : ""} onClick={() => navigate("selected")}>Ma sélection <span>{kept.length}</span></button><button className={view === "add" ? "current" : ""} onClick={() => navigate("add")}>Ajouter</button></nav>
    {notice && <p role="status" className="notice">{notice}</p>}
    <div hidden={!!active || view !== "search"}><CompanySearchPanel addedSirens={addedSirens} onAdd={importCompany}/></div>
    {!active && view === "search" ? null : active && company ? <section className="detail"><button className="text-button" onClick={() => { if (canLeave()) setActive(null); }}>← {view === "discover" ? "À découvrir" : "Ma sélection"}</button><CompanyProfile key={company.id} company={company} onSave={editCompany} onEnrich={enrich} onDirtyChange={setDirty}/>{!state.choices[company.id] && <div className="decision"><button onClick={() => { if (canLeave()) { choose(company.id, "pass"); setActive(null); } }}>Passer</button><button className="primary" onClick={() => { choose(company.id, "keep"); setNotice("Profil gardé dans votre sélection."); }}>Garder ce profil</button></div>}<div className="decision"><button onClick={() => setState(s => ({ ...s, decisions: { ...s.decisions, [company.id]: "later" } }))}>À revoir</button><button className="primary" onClick={() => setState(s => ({ ...s, decisions: { ...s.decisions, [company.id]: "prospect" } }))}>Préparer une candidature</button></div>{state.decisions[company.id] === "later" && <p className="note">Profil conservé pour plus tard.</p>}{state.decisions[company.id] === "prospect" && <div className="compose"><h2>Préparer le message</h2><p className="note">Vérifiez l’idée, les faits et le destinataire. Gmail s’ouvrira avec le message prérempli : vous déciderez de l’envoyer.</p><label>Destinataire<input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="adresse@entreprise.fr" type="email" /></label><label>Objet<input value={subject} onChange={e => setState(s => ({ ...s, subjects: { ...s.subjects, [company.id]: e.target.value } }))}/></label><label>Message<textarea rows={13} value={message} onChange={e => setState(s => ({ ...s, messages: { ...s.messages, [company.id]: e.target.value } }))}/></label><a className="primary gmail" href={gmail} target="_blank" rel="noreferrer">Ouvrir dans Gmail ↗</a></div>}</section> : view === "add" ? <section><p className="kicker">Votre prochaine découverte</p><h1>Ajouter une entreprise</h1><p className="muted">Renseignez ce que vous savez. Vous pourrez compléter la fiche au fil de vos recherches.</p><details className="pilot-examples"><summary>Essayer avec trois entreprises documentées</summary><p className="note">Sources officielles consultées le 4 novembre 2026. Exemples à étudier, sans présumer d’un besoin ni d’un recrutement.</p><div className="editor-actions">{enrichmentExamples.map(example => <button key={example.siren} onClick={() => openExample(example)}>{addedSirens.includes(example.siren!) ? "Ouvrir" : "Ajouter"} {example.name}</button>)}</div></details><CompanyEditor initial={emptyCompany} creating onDirtyChange={setDirty} onSave={add} onCancel={() => setView("discover")}/></section> : view === "selected" ? <section><p className="kicker">Prendre le temps</p><h1>Votre sélection<span className="count"> {kept.length}</span></h1><p className="muted">Approfondissez les profils avant de décider qui contacter.</p>{kept.length ? <div className="selected-list">{kept.map(c => <button key={c.id} onClick={() => setActive(c.id)}><span><strong>{c.name}</strong><small>{c.sector || "Secteur à compléter"} · {c.city || "Lieu à compléter"}</small></span><span aria-hidden="true">↗</span></button>)}</div> : <div className="empty"><p>Aucune entreprise gardée pour le moment.</p><button className="text-button" onClick={() => setView("discover")}>Découvrir les profils →</button></div>}</section> : <section><div className="intro"><div><p className="kicker">Votre sélection personnelle</p><h1>De belles rencontres<br/><em>professionnelles.</em></h1></div><p>Découvrez des entreprises, puis prenez le temps de trouver comment leur être utile.</p></div>{pending[0] ? <article className="company-card"><div className="card-top"><span>À découvrir</span><span>{pending.length} restant{pending.length > 1 ? "s" : ""}</span></div><div className="card-art" aria-hidden="true"><span>{pending[0].name.slice(0,1).toUpperCase()}</span><i>◌</i></div><div className="card-body"><p className="card-meta">{pending[0].sector || "Secteur à compléter"} <span> / </span> {pending[0].city || "Lieu à compléter"}</p><h2>{pending[0].name}</h2><p>{pending[0].description || "Description à compléter."}</p><div className="signal"><strong>À observer</strong><p>{pending[0].signal}</p></div><button className="text-button" onClick={() => setActive(pending[0].id)}>Ouvrir et compléter la fiche →</button><div className="card-actions"><button onClick={() => choose(pending[0].id, "pass")}>Passer</button><button className="primary" onClick={() => choose(pending[0].id, "keep")}>Garder ce profil</button></div></div></article> : <div className="empty"><h2>Vous avez tout parcouru.</h2><p>Retrouvez vos choix ou ajoutez une entreprise pour continuer.</p><button className="primary" onClick={() => setView("selected")}>Voir ma sélection</button><button className="text-button" onClick={() => setState(s => ({ ...s, choices: Object.fromEntries(Object.entries(s.choices).filter(([,v]) => v !== "pass")) }))}>Revoir les profils passés</button></div>}<p className="pilot-footnote">Recherche à la demande dans Sirene · Les profils restent à approfondir.</p></section>}
    <footer>Swipe & Prospect <span>·</span> <a href="/atelier">Ancien atelier</a> <span>·</span> Données enregistrées sur cet appareil</footer>
  </div></main>;
}
