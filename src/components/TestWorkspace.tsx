"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoredDossier, StoredRun } from '@/lib/store';
import type { CollectedPage } from '@/lib/collector';
import type { Workflow } from '@/lib/workflow';
import type { ServiceStatus } from '@/lib/services';
import type { Delivery } from '@/lib/delivery';
import type { Dossier } from '@/lib/schemas';
import { DossierView } from './DossierView';
import { associationSourceRequired } from '@/lib/analysis-readiness';

const deliveryLabels: Record<string, string> = { sending: 'En cours', accepted: 'Accepté par le serveur — réception à confirmer', received: 'Réception confirmée par vous', failed: 'Échec confirmé', uncertain: 'Résultat incertain — boîte à vérifier' };
type Preview = { id: string; revision: number; recipient: string; subject: string; body: string };
type Revision = { revision: number; createdAt: string; content: Dossier };
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TestWorkspace({ run, dossier, pages, work, services, history, sent }: { run: StoredRun; dossier: StoredDossier | null; pages: CollectedPage[]; work: Workflow | null; services: ServiceStatus; history: Revision[]; sent: Delivery[] }) {
  const router = useRouter();
  const [urls, setUrls] = useState(pages.filter(p => p.source.origin === 'public_page').map(p => p.source.url).join('\n') || run.input.url || dossier?.content.identity.website || '');
  const [manualText, setManualText] = useState(pages.find(p => p.source.origin === 'user_input')?.text || ('summary' in run.input ? [run.input.name, run.input.location, run.input.activity, run.input.summary, run.input.sourceNote].filter(Boolean).join('\n') : ''));
  const [subject, setSubject] = useState(dossier?.content.draft?.subject || '');
  const [body, setBody] = useState(dossier?.content.draft?.body || '');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [replace, setReplace] = useState(false);
  const [retry, setRetry] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sourcesEdited, setSourcesEdited] = useState(false);
  const requestPending = useRef(false);
  useEffect(() => { setSubject(dossier?.content.draft?.subject || ''); setBody(dossier?.content.draft?.body || ''); setPreview(null); setReplace(false); }, [dossier?.revision, dossier?.content.draft?.subject, dossier?.content.draft?.body]);
  const dirty = subject !== (dossier?.content.draft?.subject || '') || body !== (dossier?.content.draft?.body || '');
  const active = !!busy || !!(work && ['collecting','analyzing'].includes(work.state));
  useEffect(() => {
    if (busy || !work || !['collecting', 'analyzing'].includes(work.state)) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [busy, work?.state, router]);
  const needsSource = associationSourceRequired(run.input, pages);
  const diagnosticId = (error || work?.error || '').match(/Diagnostic IA : ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i)?.[1];
  const siteSearch = `https://www.google.com/search?q=${encodeURIComponent(`${run.label} association Lyon site officiel`)}`;
  async function action(actionName: string, data: Record<string, unknown> = {}) {
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(actionName); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/tests/${run.id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionName, ...data }) });
      const result = await response.json().catch(() => { throw new Error('Réponse du serveur illisible ou connexion interrompue. Rechargez la page pour vérifier l’état du traitement avant de réessayer.'); });
      if (!response.ok) throw new Error(result.error || 'Action impossible.');
      if (result.preview) { setPreview(result.preview); setRetry(false); }
      if (actionName === 'send') setRetry(false);
      if (actionName === 'collect') setSourcesEdited(false);
      if (result.run) { router.push(`/tests/${result.run.id}`); return; }
      setMessage(actionName === 'draft' ? 'Brouillon enregistré. La version précédente est conservée.' : actionName === 'collect' ? 'Collecte terminée. Vérifiez les résultats ci-dessous.' : actionName === 'send' ? 'Tentative enregistrée. Consultez son état ci-dessous.' : actionName === 'received' ? 'Réception confirmée.' : actionName === 'analyze' ? 'Nouvelle fiche préparée.' : 'Prévisualisation prête.');
      router.refresh();
    } catch (failure) { setError(failure instanceof TypeError ? 'Connexion interrompue. Vérifiez votre connexion puis rechargez la page pour connaître l’état du traitement.' : failure instanceof Error ? failure.message : 'Action impossible.'); router.refresh(); }
    finally { requestPending.current = false; setBusy(''); }
  }
  return <>
    <section className="panel workflow-panel" aria-labelledby="prepare-heading">
      <div className="panel-heading"><h2 id="prepare-heading">Préparer ce dossier</h2><span className="version">Ciblage v{run.profileVersion}</span></div>
      <p className="panel-intro">Consultez jusqu’à six pages publiques : accueil, activité, agenda, adhésion, contact ou autres pages utiles. Ajoutez le site de l’association si la fiche vient de l’annuaire. Les pages qui demandent une connexion ou JavaScript peuvent rester illisibles.</p>
      <form className="form-stack" onSubmit={event => { event.preventDefault(); void action('collect', { urls: urls.split(/\n/).map(v => v.trim()).filter(Boolean), manualText }); }}>
        <label>Pages à consulter — une URL par ligne<textarea disabled={active} rows={3} value={urls} onChange={e => { setUrls(e.target.value); setSourcesEdited(true); }} placeholder="https://association.fr/&#10;https://association.fr/contact/" /></label>
        <details><summary>Ajouter des informations manuelles</summary><label>Informations et provenance<textarea disabled={active} rows={5} maxLength={18000} value={manualText} onChange={e => { setManualText(e.target.value); setSourcesEdited(true); }} /></label></details>
        <div className="form-footer"><button className="secondary-button" disabled={active}>{busy === 'collect' ? 'Consultation des pages…' : 'Collecter ces sources'}</button><button type="button" className="secondary-button" disabled={active || dirty} onClick={() => void action('rerun')}>Nouveau test avec le ciblage actuel</button></div>
      </form>
      {pages.length > 0 && <div className="collected-pages">{pages.map(page => <details key={page.source.id}><summary>{page.source.label} · {page.source.accessStatus === 'available' ? 'Lisible' : 'Inaccessible'}</summary><p>{page.error || `${page.text.length} caractères collectés le ${new Date(page.source.consultedAt!).toLocaleString('fr-FR')}`}</p>{page.source.url && <a href={page.source.url} target="_blank" rel="noreferrer">Ouvrir la source</a>}{page.text && <pre className="source-text">{page.text}</pre>}</details>)}</div>}
      {needsSource && <p className="warning">L’annuaire confirme seulement l’identité de l’association. Ajoutez ci-dessus au moins une page publique décrivant ses activités, son agenda ou ses adhésions, puis cliquez sur « Collecter ces sources ». <a href={siteSearch} target="_blank" rel="noreferrer">Chercher son site ↗</a></p>}
      {sourcesEdited && <p className="warning" role="status">Les sources ont été modifiées. Cliquez sur « Collecter ces sources » avant de lancer l’analyse.</p>}
      {dirty && <p className="warning">Enregistrez les modifications du brouillon avant de relancer l’analyse.</p>}
      {dossier && <label className="check-line"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /> Créer une nouvelle version de la fiche ; conserver la précédente.</label>}
      <div className="form-footer"><button className="primary-button" disabled={active || dirty || sourcesEdited || !services.aiReady || needsSource || !pages.some(p => p.source.accessStatus === 'available') || (!!dossier && !replace)} onClick={() => void action('analyze', { revision: dossier?.revision || 0, replace })}>{busy === 'analyze' ? 'Préparation de la fiche…' : 'Préparer la fiche avec l’IA'}</button><span className="field-help">{services.aiReady ? `${services.aiModel} · ${services.dailyLimit} appels maximum par jour UTC` : 'Analyse IA à connecter dans la configuration du serveur.'}</span></div>
      {work?.error && !error && !active && <p className="warning">Dernier traitement : {work.error}</p>}
      {(active || message) && <p className="form-message" role="status">{active ? 'Traitement en cours. Vous pouvez consulter le reste de la fiche.' : message}</p>}
      {error && <p role="alert" className="warning">{error}</p>}
      {!active && diagnosticId && <p><a href={`/api/tests/${run.id}/diagnostics/${diagnosticId}`} download>Télécharger le diagnostic de cette analyse</a><br /><span className="field-help">À transmettre pour comprendre l’échec. Ne contient ni clé API ni texte des sources. Le téléchargement ne consomme aucun appel IA.</span></p>}
    </section>
    {dossier && <>
      <DossierView dossier={dossier.content} showDraft={false} />
      <section className="panel workflow-panel" aria-labelledby="draft-heading"><div className="panel-heading"><h2 id="draft-heading">Votre brouillon</h2><span className="version">Non envoyé · v{dossier.revision}</span></div>
        <form className="form-stack" onSubmit={event => { event.preventDefault(); void action('draft', { revision: dossier.revision, draft: { channel: dossier.content.draft?.channel || 'email', angle: dossier.content.draft?.angle || dossier.content.approach.angle, subject, body, state: 'draft' } }); }}>
          <label>Objet<input disabled={active} required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} /></label><label>Message<textarea disabled={active} required rows={12} maxLength={8000} value={body} onChange={e => setBody(e.target.value)} /></label>
          <div className="form-footer"><button className="primary-button" disabled={active || !dirty}>{busy === 'draft' ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button><span className="field-help">{dirty ? 'Modifications non enregistrées.' : 'Version enregistrée.'}</span></div>
        </form>
      </section>
      <section className="panel workflow-panel" aria-labelledby="delivery-heading"><h2 id="delivery-heading">Recevoir le dossier de test</h2><p>La fiche complète et son brouillon seront adressés à votre boîte personnelle.</p>
        <p className="subtle-note">{services.recipient ? `Destinataire autorisé : ${services.recipient}` : 'Adresse personnelle à renseigner dans la configuration du serveur.'}{!services.mailReady && ' Service e-mail non connecté : la prévisualisation et le téléchargement restent disponibles.'}</p>
        <button className="secondary-button" disabled={active || dirty} onClick={() => void action('preview')}>Prévisualiser le dossier à envoyer</button>{dirty && <p className="field-help">Enregistrez d’abord vos modifications.</p>}
        {preview && <div className="delivery-preview"><h3>{preview.subject}</h3><p>À : {preview.recipient || 'Adresse non configurée'} · Version {preview.revision}</p><pre>{preview.body}</pre><div className="form-footer"><button className="secondary-button" onClick={() => download(preview.body, `dossier-${run.id}-v${preview.revision}.txt`)}>Télécharger le dossier</button><button className="primary-button" disabled={active || dirty || !services.mailReady || sent.some(s => s.revision === preview.revision && !(['failed','uncertain'].includes(s.state) && retry))} onClick={() => void action('send', { previewId: preview.id, retry })}>{busy === 'send' ? 'Envoi…' : 'Envoyer le dossier de test à mon adresse'}</button></div>{sent.some(s => s.revision === preview.revision && ['failed','uncertain'].includes(s.state)) && <label className="check-line"><input type="checkbox" checked={retry} onChange={e => setRetry(e.target.checked)} /> J’ai vérifié ma boîte et les indésirables ; je souhaite reprendre l’envoi.</label>}</div>}
        {sent.length > 0 && <ul className="delivery-list">{sent.map(item => <li key={item.id}><strong>Version {item.revision} · {deliveryLabels[item.state] || item.state}</strong><p>{item.recipient} · {new Date(item.created_at).toLocaleString('fr-FR')}</p>{item.error && <p className="warning">{item.error}</p>}{['accepted','uncertain'].includes(item.state) && <button className="secondary-button" disabled={active} onClick={() => void action('received', { deliveryId: item.id })}>J’ai reçu ce dossier</button>}</li>)}</ul>}
      </section>
      <section className="workflow-panel"><h2>Versions précédentes</h2>{history.length ? history.map(item => <details className="revision-row" key={item.revision}><summary>Version {item.revision} · conservée le {new Date(item.createdAt).toLocaleString('fr-FR')}</summary><p>{item.content.summary}</p>{item.content.draft && <><h3>{item.content.draft.subject}</h3><pre className="source-text">{item.content.draft.body}</pre></>}<button className="secondary-button" onClick={() => download(JSON.stringify(item.content, null, 2), `dossier-${run.id}-v${item.revision}.json`)}>Télécharger cette version complète</button></details>) : <p className="quiet">Les prochaines corrections conserveront ici la version précédente.</p>}</section>
    </>}
  </>;
}
