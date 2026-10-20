'use strict';

// Static reference material for reviewing the flow, not a fresh AI analysis.
const examples = [
  {
    id: 'kotopo', name: 'KoToPo', location: 'Lyon 1er · Culture et langues', tone: 'blue', date: '11 octobre 2026',
    headline: 'Un programme à publier une seule fois.',
    observation: 'Le dossier fourni décrit une programmation régulière publiée dans un PDF mensuel.',
    intervention: 'Un calendrier partagé qui facilite la publication des rendez-vous.',
    summary: 'Mille et une langues anime le lieu KoToPo : rencontres linguistiques, concerts, expositions et vie associative.',
    why: 'Le programme mensuel décrit dans ton dossier donne une piste concrète pour simplifier la diffusion des événements. Le temps réellement consacré à cette tâche reste à confirmer.',
    facts: ['Une programmation régulière et un programme mensuel en PDF sont décrits dans le dossier.', 'Le dossier relève une recherche publique de compétences pour le site et la communication.'],
    debt: 'La diffusion du programme constitue une piste observable. Le PDF seul ne prouve pas une double saisie ni un dysfonctionnement interne.',
    absorption: 'Les rencontres récurrentes et les missions mentionnées donnent des pistes d’interlocuteurs. Leur disponibilité pour une mission reste inconnue.',
    deliverable: 'Un exemple de calendrier pour quelques rendez-vous, avec un parcours de publication simple à transmettre aux bénévoles.',
    questions: ['Comment le programme est-il préparé et diffusé aujourd’hui ?', 'Une saisie unique serait-elle réellement utile ?', 'Qui pourrait maintenir le calendrier après la mise en place ?'],
    reservations: 'Reprendre les pages citées avant une prise de contact. Les chiffres de fréquentation, le budget et les outils internes ne sont pas établis par cette maquette.',
    sources: [{ label: 'Programme du KoToPo', url: 'http://www.kotopo.net/programme.php' }, { label: 'Participer au KoToPo', url: 'http://www.kotopo.net/participer.php?L=fr' }],
    provenance: 'Dossier KoToPo fourni par Rémi, daté du 11 octobre 2026. Ces pages n’ont pas été recollectées pour la maquette.',
    draft: 'Bonjour,\n\nJ’ai découvert votre programmation et votre programme mensuel. Comment préparez-vous aujourd’hui sa diffusion sur vos différents supports ?\n\nJe travaille sur les sites et les automatisations pour les associations. Si cette publication vous prend du temps, je pourrais vous montrer un petit exemple de calendrier partagé, facile à reprendre par les bénévoles.\n\nEst-ce un sujet qui vous serait utile ?'
  },
  {
    id: 'anciela', name: 'Anciela', location: 'Lyon 7e · Engagement citoyen', tone: 'green', date: '28 septembre 2026',
    headline: 'Mieux suivre les premiers échanges.',
    observation: 'Le dossier exemple décrit un accompagnement d’initiatives et un parcours de rendez-vous.',
    intervention: 'Explorer le suivi des demandes avant de proposer une automatisation.',
    summary: 'Anciela accompagne l’engagement écologique et solidaire à Lyon, notamment par sa Pépinière d’initiatives.',
    why: 'Le parcours d’accompagnement donne un sujet d’échange précis : le passage d’une première demande à un rendez-vous. Aucune difficulté actuelle n’est démontrée dans le dossier exemple.',
    facts: ['L’association se présente comme indépendante et active dans l’engagement écologique et solidaire.', 'Sa Pépinière décrit un accompagnement gratuit des initiatives citoyennes.'],
    debt: 'Aucune dette numérique établie. Le site et plusieurs supports existent déjà ; leurs outils internes ne sont pas connus.',
    absorption: 'Un parcours d’accompagnement identifiable fournit un point d’entrée. Le référent et le besoin réel restent à confirmer.',
    deliverable: 'Une cartographie courte du parcours demande → rendez-vous, puis une seule amélioration si une tâche répétitive est confirmée.',
    questions: ['Le suivi des demandes présente-t-il une difficulté ?', 'Quels outils sont déjà utilisés ?', 'Quelles informations peuvent être utilisées dans une automatisation ?'],
    reservations: 'Ce cas sert à tester le parcours. Sans signal complémentaire, il resterait en recherche plutôt que dans une sélection de besoins identifiés.',
    sources: [{ label: 'Découvrir Anciela', url: 'https://www.anciela.info/decouvrir-anciela/' }, { label: 'Site officiel', url: 'https://www.anciela.info/' }],
    provenance: 'Dossier exemple du projet, daté du 28 septembre 2026. Sources à reconsulter ; aucun besoin confirmé par cette maquette.',
    draft: 'Bonjour,\n\nJ’ai découvert l’accompagnement proposé par votre Pépinière. Je serais curieux de comprendre comment vous suivez les premières demandes et les rendez-vous.\n\nJ’aide les associations à simplifier certaines tâches répétitives et à organiser leurs informations. Rencontrez-vous une difficulté de suivi sur laquelle une petite amélioration pourrait être utile ?'
  },
  {
    id: 'artis', name: 'Artis MBC', location: 'Lyon 7e · Musique et vie culturelle', tone: 'slate', date: '28 septembre 2026',
    headline: 'Les événements, au même endroit.',
    observation: 'Le dossier exemple présente des projets musicaux, des répétitions et des événements.',
    intervention: 'Examiner comment les informations sont partagées avec les musiciens.',
    summary: 'Musique, Bazar et Compagnie est une association musicale implantée à la Guillotière, avec des projets collectifs et des événements.',
    why: 'La coordination des événements offre un angle de discussion. L’existence d’une difficulté ou d’un besoin de nouvel outil n’est pas établie.',
    facts: ['Le dossier situe l’association à la Guillotière, à Lyon 7e.', 'Il décrit des projets de musiques amplifiées et de rue ainsi qu’un agenda événementiel.'],
    debt: 'Aucun dysfonctionnement prouvé. Le parcours de partage des dates et informations pourrait être examiné avec l’association.',
    absorption: 'Les activités collectives donnent un contexte de mission. La présence d’un référent et sa disponibilité sont à confirmer.',
    deliverable: 'Un exemple de fiche événement partagée, seulement si les personnes concernées confirment une difficulté de coordination.',
    questions: ['Comment les dates et les informations pratiques sont-elles mises à jour ?', 'Existe-t-il déjà un outil partagé satisfaisant ?', 'Quel changement serait facile à maintenir ?'],
    reservations: 'Ce cas illustre un angle exploratoire, pas un besoin identifié. Dans la version connectée, des preuves supplémentaires seraient nécessaires pour publier cette proposition.',
    sources: [{ label: 'Qui sommes-nous ?', url: 'https://www.artis-mbc.fr/qui-sommes-nous/' }, { label: 'Site officiel', url: 'https://www.artis-mbc.fr/' }],
    provenance: 'Dossier exemple du projet, daté du 28 septembre 2026. Aucun nouveau constat collecté pour la maquette.',
    draft: 'Bonjour,\n\nVos projets musicaux m’ont donné envie de découvrir votre fonctionnement. Comment partagez-vous aujourd’hui les dates et les informations pratiques entre les personnes qui préparent les événements ?\n\nSi une tâche de coordination vous prend du temps, je peux vous proposer un premier exemple simple, à adapter avec vous.'
  }
];

const storageKey = 'swipe-prospect-mobile-prototype-v1';
const followupStates = ['À explorer', 'À contacter', 'Contactée', 'À relancer'];
const screen = document.querySelector('#screen');
const notice = document.querySelector('#notice');
let state = { choices: {}, history: [], followup: {}, drafts: {} };
let persistenceAvailable = true;
let view = 'propositions';
let detailOrigin = 'propositions';
let transitionPending = false;
const svg = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
  keep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>'
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const current = () => examples.find(item => !state.choices[item.id]);
const kept = () => examples.filter(item => state.choices[item.id] === 'keep');

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && typeof saved === 'object') {
    for (const key of ['choices', 'followup', 'drafts']) if (saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key])) state[key] = saved[key];
    if (Array.isArray(saved.history)) state.history = saved.history.filter(entry => examples.some(item => item.id === entry.id) && ['keep', 'pass'].includes(entry.choice));
    for (const key of Object.keys(state.choices)) if (!examples.some(item => item.id === key) || !['keep', 'pass'].includes(state.choices[key])) delete state.choices[key];
  }
} catch { persistenceAvailable = false; }

function announce(text) { notice.textContent = text; }
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { persistenceAvailable = false; }
  if (!persistenceAvailable) announce('Choix conservés pendant cette visite seulement : le stockage du navigateur est indisponible.');
}
function render(focus = false) {
  transitionPending = false;
  document.querySelectorAll('[data-nav]').forEach(button => {
    const active = button.dataset.nav === (view === 'dossier' ? detailOrigin : view);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelector('#saved-count').textContent = kept().length ? `(${kept().length})` : '';
  if (view === 'propositions') renderProposals();
  else if (view === 'selection') renderSelection();
  else if (view === 'plus') renderPlus();
  if (focus) screen.focus({ preventScroll: true });
}
function navigate(next) {
  view = next;
  announce('');
  render(true);
  screen.scrollIntoView({ block:'start', behavior:'instant' });
}
function undoButton() { return `<div class="undo-row"><button type="button" data-action="undo" ${state.history.length ? '' : 'disabled'}>Annuler le dernier choix</button></div>`; }
function renderProposals() {
  const item = current();
  const seen = Object.keys(state.choices).length;
  const heading = `<div class="page-heading"><h1>Tes propositions</h1><p>${item ? `${seen + 1} sur ${examples.length}` : `${seen} examinées`}</p></div>`;
  if (!item) {
    screen.innerHTML = heading + `<section class="empty"><h2>Tu as fait le tour.</h2><p>${kept().length ? `${kept().length} association${kept().length > 1 ? 's' : ''} dans ta sélection. Tu peux maintenant approfondir les dossiers.` : 'Aucune association retenue pour le moment. Tu peux revenir sur ton dernier choix.'}</p><button type="button" class="button primary" data-nav="selection">Ouvrir ma sélection</button></section>` + undoButton();
    return;
  }
  screen.innerHTML = heading + `<div class="deck" aria-label="Carte de ${escape(item.name)}"><article class="prospect-card tone-${item.tone}">
    <div class="card-lead"><h2>${escape(item.name)}</h2><p class="card-location">${escape(item.location)}</p><h3>${escape(item.headline)}</h3></div>
    <div class="card-body"><p>${escape(item.observation)}</p><h4>Ce que tu pourrais proposer</h4><p class="intervention">${escape(item.intervention)}</p><div class="card-foot"><small>Piste exemple, à confirmer</small><button type="button" class="text-button" data-detail="${item.id}">Lire le dossier</button></div></div>
  </article></div><div class="actions"><button type="button" class="button" data-action="pass">${svg.pass}Passer</button><button type="button" class="button primary" data-action="keep">${svg.keep}Garder</button></div>${undoButton()}`;
  attachSwipe();
}
function choose(choice) {
  const item = current();
  if (!item || transitionPending) return;
  transitionPending = true;
  state.choices[item.id] = choice;
  state.history.push({ id:item.id, choice });
  persist();
  render(true);
  announce(choice === 'keep' ? `${item.name} ajoutée à ta sélection.` : `${item.name} passée. Tu peux annuler ce choix.`);
}
function undo() {
  const last = state.history.pop();
  if (!last) return;
  delete state.choices[last.id];
  persist();
  navigate('propositions');
  announce('Dernier choix annulé. La carte est de nouveau disponible.');
}
function renderSelection() {
  screen.innerHTML = `<div class="page-heading"><h1>Ma sélection</h1><p>${kept().length} association${kept().length > 1 ? 's' : ''}</p></div>` + (kept().length ? `<ul class="list">${kept().map(item => `<li class="list-item"><h2>${escape(item.name)}</h2><p>${escape(item.location)}</p><p>${escape(item.intervention)}</p><button type="button" class="text-button" data-detail="${item.id}">Ouvrir le dossier</button><label class="status-label">Prochaine étape<select data-followup="${item.id}" aria-label="Suivi de ${escape(item.name)}">${followupStates.map(status => `<option ${status === (state.followup[item.id] || followupStates[0]) ? 'selected' : ''}>${status}</option>`).join('')}</select></label></li>`).join('')}</ul>` : '<section class="empty"><h2>Ta sélection commence ici.</h2><p>Garde une association dans les propositions pour retrouver son dossier et préparer la suite.</p><button type="button" class="button primary" data-nav="propositions">Voir les propositions</button></section>');
}
function showDossier(id) {
  const item = examples.find(record => record.id === id);
  if (!item) return;
  if (view !== 'dossier') detailOrigin = view;
  view = 'dossier';
  document.querySelectorAll('[data-nav]').forEach(button => { if (button.dataset.nav === detailOrigin) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  const bulletList = values => `<ul>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
  const draft = typeof state.drafts[id] === 'string' ? state.drafts[id] : item.draft;
  screen.innerHTML = `<button type="button" class="back" data-action="back">${svg.back}Retour ${detailOrigin === 'selection' ? 'à ma sélection' : 'aux propositions'}</button>
    <header class="dossier-head"><h1>${escape(item.name)}</h1><p>${escape(item.location)}</p></header>
    <section class="dossier-section insight"><h2>Pourquoi cette association ?</h2><p>${escape(item.why)}</p></section>
    <section class="dossier-section"><h2>L’association en quelques mots</h2><p>${escape(item.summary)}</p></section>
    <section class="dossier-section"><h2>Les observations du dossier</h2>${bulletList(item.facts)}<details><summary>Voir les références et leur date</summary><p class="source-note">${escape(item.provenance)}</p><ul class="source-list">${item.sources.map(source => `<li><a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.label)}</a></li>`).join('')}</ul><p class="source-note">Dossier exemple du ${escape(item.date)}. À revérifier avant contact.</p></details></section>
    <section class="dossier-section"><h2>La piste à explorer</h2><p>${escape(item.intervention)}</p><h3>Un premier livrable</h3><p>${escape(item.deliverable)}</p><h3>À confirmer avec l’association</h3>${bulletList(item.questions)}</section>
    <section class="dossier-section"><h2>Ce que l’on peut en déduire</h2><h3>Besoin numérique observable</h3><p>${escape(item.debt)}</p><h3>Capacité à accueillir une mission</h3><p>${escape(item.absorption)}</p><h3>Réserves</h3><p>${escape(item.reservations)}</p></section>
    <section class="dossier-section"><h2>Préparer le premier échange</h2><p class="source-note">Brouillon d’illustration, à adapter après vérification des sources. Aucun message n’est envoyé.</p><label class="field" for="draft">Ton message<textarea id="draft" data-draft="${id}" maxlength="8000" rows="9">${escape(draft)}</textarea></label><div class="draft-actions"><button type="button" class="button" data-copy="${id}">Copier le brouillon</button></div></section>`;
  screen.focus({ preventScroll:true });
  screen.scrollIntoView({ block:'start', behavior:'instant' });
  announce('');
}
function renderPlus() {
  screen.innerHTML = `<div class="page-heading"><h1>À ta main</h1></div><div class="utility"><h2>Le ciblage est déjà intégré.</h2><p>Associations lyonnaises, tous secteurs. Les pistes concernent l’automatisation, le site web, le CRM, la newsletter et l’organisation des données.</p><h2>Ajouter une association reste possible.</h2><p>Dans la version connectée, cet accès facultatif permettra de proposer une association ou d’ajouter une source. Il ne sera jamais nécessaire pour consulter les propositions.</p><details><summary>Voir le formulaire prévu</summary><form id="manual-example"><label class="field">Nom de l’association<input name="name" maxlength="160" required autocomplete="off"></label><label class="field">Site ou page de référence<input name="url" type="url" placeholder="https://association.fr" required></label><button class="button" type="submit">Tester l’ajout dans la maquette</button><p class="source-note">Formulaire de démonstration uniquement. Aucune recherche n’est lancée et rien n’est envoyé au serveur.</p></form></details><h2>À propos des exemples</h2><p>Cette maquette utilise trois dossiers existants. Les pistes d’Anciela et d’Artis sont exploratoires : elles nécessiteraient des preuves supplémentaires pour intégrer une vraie sélection de besoins identifiés.</p><p>Les choix et modifications restent dans ce navigateur. La maquette n’est pas encore une application installable et ne synchronise pas les données entre tes appareils.</p><button type="button" class="button" data-action="reset">Recommencer avec les trois exemples</button></div>`;
}
function attachSwipe() {
  const deck = screen.querySelector('.deck');
  const card = screen.querySelector('.prospect-card');
  if (!deck || !card) return;
  let start = null;
  deck.addEventListener('pointerdown', event => {
    if (event.target.closest('button,a,input,textarea,select') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    start = { x:event.clientX, y:event.clientY, id:event.pointerId };
    deck.setPointerCapture(event.pointerId);
  });
  deck.addEventListener('pointermove', event => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    card.classList.add('dragging');
    card.style.transform = `translateX(${dx * .7}px) rotate(${dx * .025}deg)`;
  });
  const end = event => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (deck.hasPointerCapture(event.pointerId)) deck.releasePointerCapture(event.pointerId);
    start = null;
    card.classList.remove('dragging');
    card.style.transform = '';
    if (event.type === 'pointerup' && Math.abs(dx) > 85 && Math.abs(dx) > Math.abs(dy) * 1.3) choose(dx > 0 ? 'keep' : 'pass');
  };
  deck.addEventListener('pointerup', end);
  deck.addEventListener('pointercancel', end);
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.nav) return navigate(button.dataset.nav);
  if (button.dataset.detail) return showDossier(button.dataset.detail);
  const action = button.dataset.action;
  if (action === 'keep' || action === 'pass') return choose(action);
  if (action === 'undo') return undo();
  if (action === 'back') return navigate(detailOrigin);
  if (action === 'reset') {
    state = { choices:{}, history:[], followup:{}, drafts:{} };
    persist(); navigate('propositions'); announce('Les trois exemples sont de nouveau disponibles.');
  }
  if (button.dataset.copy) {
    const textarea = screen.querySelector('#draft');
    try { await navigator.clipboard.writeText(textarea.value); announce('Brouillon copié. Aucun message envoyé.'); }
    catch { textarea.focus(); textarea.select(); announce('Sélectionne puis copie le texte du brouillon.'); }
  }
});
document.addEventListener('change', event => {
  if (event.target.dataset.followup && followupStates.includes(event.target.value)) {
    state.followup[event.target.dataset.followup] = event.target.value;
    persist(); announce(`Suivi mis à jour : ${event.target.value}.`);
  }
});
document.addEventListener('input', event => {
  if (event.target.dataset.draft) { state.drafts[event.target.dataset.draft] = event.target.value; persist(); }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'manual-example') return;
  event.preventDefault();
  announce('Ajout illustré. Dans la version connectée, cette association passerait en recherche avant de pouvoir être proposée.');
});
document.querySelectorAll('a[href="#propositions"]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); navigate('propositions'); }));
render();
if (!persistenceAvailable) announce('Le navigateur ne conserve pas les choix après fermeture de cette maquette.');
