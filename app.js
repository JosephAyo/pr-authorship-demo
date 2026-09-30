'use strict';

// Fictional AI-created fixtures; never combine with participant data.
const examples = [
  { id: 'DEMO-01', title: 'Keep the search query when returning from a detail page', paragraphs: [
    'Opening a result and going back used to clear the search box. This was frustrating when comparing a few results because you had to type the same query again.',
    'The query now lives in the list view state and is restored when you return. Clearing the search box still resets the results. I checked an empty query, a query with spaces, and going back after opening two different items.'
  ] },
  { id: 'DEMO-02', title: 'Improve feedback for failed file uploads', paragraphs: [
    'This change adds an inline error message when an upload fails. Previously, the loading indicator disappeared without explaining what happened.',
    'The message distinguishes an unsupported file type from a network failure. For a network failure, a retry button keeps the selected file available so the user does not need to choose it again.',
    'Tests cover both failure paths and verify that a successful retry removes the error message.'
  ] },
  { id: 'DEMO-03', title: 'Avoid an extra blank row in CSV exports', paragraphs: [
    'Small export fix: an empty final record was being written after the last item. Some spreadsheet tools displayed it as an extra row; others ignored it.',
    'Only write a separator between records now. The header-only export is unchanged. Added a regression case for a single record and one with a quoted multiline field, since splitting on newlines would get that wrong.'
  ] }
];
const $ = id => document.getElementById(id);
const radios = [...document.querySelectorAll('input[name="authorship"]')];
const labels = { human: 'Human-written', ai: 'AI-generated', unsure: 'Not sure' };
let current = 0;
let completed = false;
let drafts = examples.map(() => ({ choice: '', confidence: '', reason: '' }));
let answers = examples.map(() => null);

function capture() {
  drafts[current] = { choice: radios.find(r => r.checked)?.value || '', confidence: $('confidence').value, reason: $('reason').value };
}
function renderProgress() {
  const count = answers.filter(Boolean).length;
  $('progress').value = count;
  $('progress-label').textContent = `${count} of ${examples.length} saved`;
  $('save').textContent = answers.every((answer, i) => i === current || answer) ? 'Save & finish demo →' : 'Save & continue →';
  $('items').replaceChildren(...examples.map((example, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'button secondary';
    button.textContent = `${index + 1}${answers[index] ? ' ✓' : ''}`;
    button.setAttribute('aria-label', `Description ${index + 1}${answers[index] ? ', saved' : ', not saved'}`);
    if (index === current) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => { capture(); current = index; renderItem(true); });
    return button;
  }));
}
function renderItem(focus = false) {
  $('demo-workspace').hidden = false; $('completion').hidden = true;
  const example = examples[current];
  $('item-count').textContent = `Demo ${current + 1} of ${examples.length}`;
  const title = document.createElement('h3'); title.textContent = example.title;
  $('description').replaceChildren(title, ...example.paragraphs.map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
  const draft = drafts[current];
  radios.forEach(r => { r.checked = r.value === draft.choice; });
  $('confidence').disabled = draft.choice === 'unsure';
  $('confidence').value = draft.confidence; $('reason').value = draft.reason;
  $('validation').textContent = ''; $('previous').disabled = current === 0;
  renderProgress();
  if (focus) $('description').focus();
}
function showCompletion() {
  completed = true; $('demo-workspace').hidden = true; $('completion').hidden = false;
  $('answer-summary').replaceChildren(...answers.map((answer, i) => {
    const row = document.createElement('article');
    const title = document.createElement('h3'); title.textContent = `Description ${i + 1} · ${labels[answer.choice]}`;
    const confidence = document.createElement('p'); confidence.className = 'field-hint';
    confidence.textContent = answer.confidence === null ? 'Confidence: not applicable' : `Confidence: ${answer.confidence} / 5`;
    const reason = document.createElement('p'); reason.textContent = answer.reason || 'No explanation provided.';
    row.append(title, confidence, reason); return row;
  }));
  $('completion-title').focus();
}
function changed() {
  capture(); answers[current] = null; completed = false;
  $('validation').textContent = ''; $('save-status').textContent = 'Unsaved changes on this description.';
  renderProgress();
}
radios.forEach(radio => radio.addEventListener('change', () => {
  const unsure = radio.value === 'unsure'; $('confidence').disabled = unsure;
  if (unsure) $('confidence').value = '';
  changed();
}));
$('confidence').addEventListener('change', changed);
$('reason').addEventListener('input', changed);
$('save').addEventListener('click', () => {
  capture(); const draft = drafts[current]; let message = ''; let target;
  if (!draft.choice) { message = 'Choose an authorship judgment, including “Not sure” if appropriate.'; target = radios[0]; }
  else if (draft.choice !== 'unsure' && !draft.confidence) { message = 'Choose your confidence level.'; target = $('confidence'); }
  if (message) { $('validation').textContent = message; target.focus(); return; }
  answers[current] = { id: examples[current].id, choice: draft.choice, confidence: draft.choice === 'unsure' ? null : Number(draft.confidence), reason: draft.reason.trim() };
  $('save-status').textContent = `Description ${current + 1} saved in this tab only.`;
  if (answers.every(Boolean)) { showCompletion(); return; }
  const next = answers.findIndex((answer, i) => i > current && !answer);
  current = next < 0 ? answers.findIndex(answer => !answer) : next;
  renderItem(true);
});
$('previous').addEventListener('click', () => { capture(); if (current > 0) current--; renderItem(true); });
$('review').addEventListener('click', () => { completed = false; current = 0; renderItem(true); });
$('restart').addEventListener('click', () => {
  if (!window.confirm('Clear all demo answers and start over?')) return;
  drafts = examples.map(() => ({ choice: '', confidence: '', reason: '' }));
  answers = examples.map(() => null); current = 0; completed = false;
  $('save-status').textContent = ''; renderItem(true);
});
$('download').addEventListener('click', () => {
  if (!answers.every(Boolean)) return;
  const payload = { status: 'DEMO_ONLY', version: 'authorship-ui-demo-v1', synthetic: true, researchData: false, exportedAt: new Date().toISOString(), answers };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'DEMO_ONLY-authorship-responses.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const welcome = document.getElementById('welcome');
const assessment = document.getElementById('assessment');

function renderRoute() {
  const isAssessment = window.location.hash === '#assessment';
  welcome.hidden = isAssessment;
  assessment.hidden = !isAssessment;
  document.title = isAssessment
    ? 'Synthetic demo · Authorship Study'
    : 'Authorship Study · Pull-request descriptions';
  if (isAssessment) {
    if (completed) showCompletion(); else renderItem();
    document.getElementById('assessment-title').focus({ preventScroll: true });
  } else if (window.location.hash === '#welcome') {
    const title = document.getElementById('welcome-title');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }
  if (window.location.hash !== '#main') window.scrollTo(0, 0);
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
