"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoredDossier, StoredRun } from '@/lib/store';
import type { CollectedPage } from '@/lib/collector';
import type { Workflow } from '@/lib/workflow';
import type { ServiceStatus } from '@/lib/services';
import type { Delivery } from '@/lib/delivery';
import type { Dossier } from '@/lib/schemas';
import { DossierView } from './DossierView';

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
  useEffect(() => { setSubject(dossier?.content.draft?.subject || ''); setBody(dossier?.content.draft?.body || ''); setPreview(null); setReplace(false); }, [dossier?.revision, dossier?.content.draft?.subject, dossier?.content.draft?.body]);
  const dirty = subject !== (dossier?.content.draft?.subject || '') || body !== (dossier?.content.draft?.body || '');
  const active = !!busy || !!(work && ['collecting','analyzing'].includes(work.state));
  async function action(actionName: string, data: Record<string, unknown> = {}) {
    setBusy(actionName); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/tests/${run.id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: actionName, ...data }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Action impossible.');
      if (result.preview) { setPreview(result.preview); setRetry(false); }
      if (actionName === 'send') setRetry(false);
      if (result.run) { router.push(`/tests/${result.run.id}`); return; }
      setMessage(actionName === 'draft' ? 'Brouillon enregistré. La version précédente est conservée.' : actionName === 'collect' ? 'Collecte terminée. Vérifiez les résultats ci-dessous.' : actionName === 'send' ? 'Tentative enregistrée. Consultez son état ci-dessous.' : actionName === 'received' ? 'Réception confirmée.' : actionName === 'analyze' ? 'Nouvelle fiche préparée.' : 'Prévisualisation prête.');
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Action impossible.'); router.refresh(); }
    finally { setBusy(''); }
  }
  return <>
    <section className="panel workflow-panel" aria-labelledby="prepare-heading">
      <div className="panel-heading"><h2 id="prepare-heading">Préparer ce dossier</h2><span className="version">Ciblage v{run.profileVersion}</span></div>
      <p className="panel-intro">Consultez jusqu’à trois pages publiques de votre choix, puis préparez la fiche à partir de leur contenu. Les pages qui demandent une connexion ou JavaScript peuvent rester illisibles.</p>
      <form className="form-stack" onSubmit={event => { event.preventDefault(); void action('collect', { urls: urls.split(/\n/).map(v => v.trim()).filter(Boolean), manualText }); }}>
        <label>Pages à consulter — une URL par ligne<textarea rows={3} value={urls} onChange={e => setUrls(e.target.value)} placeholder="https://association.fr/&#10;https://association.fr/contact/" /></label>
        <details><summary>Ajouter des informations manuelles</summary><label>Informations et provenance<textarea rows={5} maxLength={18000} value={manualText} onChange={e => setManualText(e.target.value)} /></label></details>
        <div className="form-footer"><button className="secondary-button" disabled={active}>{busy === 'collect' ? 'Consultation des pages…' : 'Collecter ces sources'}</button><button type="button" className="secondary-button" disabled={active || dirty} onClick={() => void action('rerun')}>Nouveau test avec le ciblage actuel</button></div>
      </form>
      {pages.length > 0 && <div className="collected-pages">{pages.map(page => <details key={page.source.id}><summary>{page.source.label} · {page.source.accessStatus === 'available' ? 'Lisible' : 'Inaccessible'}</summary><p>{page.error || `${page.text.length} caractères collectés le ${new Date(page.source.consultedAt!).toLocaleString('fr-FR')}`}</p>{page.source.url && <a href={page.source.url} target="_blank" rel="noreferrer">Ouvrir la source</a>}{page.text && <pre className="source-text">{page.text}</pre>}</details>)}</div>}
      {dossier && <label className="check-line"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /> Créer une nouvelle version de la fiche ; conserver la précédente.</label>}
      <div className="form-footer"><button className="primary-button" disabled={active || dirty || !services.aiReady || !pages.some(p => p.source.accessStatus === 'available') || (!!dossier && !replace)} onClick={() => void action('analyze', { revision: dossier?.revision || 0, replace })}>{busy === 'analyze' ? 'Préparation de la fiche…' : 'Préparer la fiche avec l’IA'}</button><span className="field-help">{services.aiReady ? `${services.aiModel} · ${services.dailyLimit} appels maximum par jour UTC` : 'Analyse IA à connecter dans la configuration du serveur.'}</span></div>
      {work?.error && <p className="warning">Dernier traitement : {work.error}</p>}
      {(active || message) && <p className="form-message" role="status">{busy ? 'Traitement en cours. Vous pouvez consulter le reste de la fiche.' : message}</p>}
      {error && <p role="alert" className="warning">{error}</p>}
    </section>
    {dossier && <>
      <DossierView dossier={dossier.content} showDraft={false} />
      <section className="panel workflow-panel" aria-labelledby="draft-heading"><div className="panel-heading"><h2 id="draft-heading">Votre brouillon</h2><span className="version">Non envoyé · v{dossier.revision}</span></div>
        <form className="form-stack" onSubmit={event => { event.preventDefault(); void action('draft', { revision: dossier.revision, draft: { channel: 'email', angle: dossier.content.draft?.angle || dossier.content.approach.angle, subject, body, state: 'draft' } }); }}>
          <label>Objet<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} /></label><label>Message<textarea required rows={12} maxLength={8000} value={body} onChange={e => setBody(e.target.value)} /></label>
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
