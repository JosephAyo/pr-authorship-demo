(function () {
  "use strict";
  const core = window.PreferenceCore;
  const fixtures = window.PreferenceFixtures;
  const $ = id => document.getElementById(id);
  const radios = [...document.querySelectorAll('input[name="preference"]')];
  // Native radios retain keyboard/screen-reader behavior. The surrounding card
  // adds a larger pointer target without wrapping readable prose in a button.
  for (const card of document.querySelectorAll('.description-panel')) {
    card.addEventListener('click', event => {
      const selection = window.getSelection();
      const selectedText = selection && !selection.isCollapsed &&
        [...Array(selection.rangeCount).keys()].some(i => selection.getRangeAt(i).intersectsNode(card));
      // Dragging to copy description text must not change an answer. The same
      // guard cancels label activation if the highlighted text is in the header.
      if (event.detail > 0 && (selectedText || event.detail > 1)) {
        event.preventDefault();
        return;
      }
      if (event.target.closest('input, label, a, button, select, textarea, summary')) return;
      const radio = card.querySelector('input[name="preference"]');
      radio.focus({ preventScroll: true });
      radio.click();
    });
  }
  let session = null, position = 0;
  const drafts = new Map(), saved = new Map();

  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function display(screen) {
    for (const id of ["welcome", "assessment", "completion"]) $(id).hidden = id !== screen;
  }
  function focusTitle(id) { $(id).focus(); $(id).scrollIntoView({ block: "start" }); }
  function item() { return session.schedule[position]; }
  function readAnswer() {
    const choice = radios.find(x => x.checked)?.value || "";
    return { choice, uncertainty: choice === "unsure" ? ($("uncertainty").value || null) : null, reason: $("reason").value };
  }
  function updateUncertainty() {
    const unsure = radios.find(x => x.checked)?.value === "unsure";
    $("uncertainty-field").hidden = !unsure;
    $("uncertainty").disabled = !unsure;
    if (!unsure) $("uncertainty").value = "";
  }
  function rememberEdit() {
    drafts.set(item().caseId, readAnswer());
    saved.delete(item().caseId);
    $("validation").textContent = "";
    $("save-status").textContent = "Unsaved changes in this tab. Save this answer to include it in the demo export.";
    updateProgress();
  }
  function updateProgress() {
    $("progress").value = saved.size;
    $("progress-label").textContent = `${saved.size} of ${session.schedule.length} answers saved`;
    $("case-nav").replaceChildren();
    session.schedule.forEach((row, i) => {
      const button = node("button", `${i + 1}${saved.has(row.caseId) ? " ✓" : ""}`);
      button.type = "button";
      button.setAttribute("aria-label", `Pair ${i + 1}, ${saved.has(row.caseId) ? "saved" : "not saved"}`);
      if (position === i) button.setAttribute("aria-current", "step");
      button.addEventListener("click", () => { drafts.set(item().caseId, readAnswer()); position = i; renderPair(); });
      $("case-nav").append(button);
    });
  }
  function renderDescription(target, description) {
    target.replaceChildren();
    for (const [kind, text] of description.blocks) {
      if (kind === "ul") {
        const list = node("ul");
        text.forEach(line => list.append(node("li", line)));
        target.append(list);
      } else target.append(node(kind, text));
    }
  }
  function renderPatch(text) {
    const target = $("patch");
    target.replaceChildren();
    text.split("\n").forEach((line, i) => {
      // Keep diff file headers neutral; only actual +/- change lines are colored.
      const header = /^(?:---|\+\+\+)(?:\s|$)/.test(line);
      const type = !header && line.startsWith("+") ? "added" :
        !header && line.startsWith("-") ? "removed" : "context";
      if (i > 0) target.append(document.createTextNode("\n"));
      // Use textContent via node(), never parse code as HTML. Separate newline
      // nodes retain the exact patch text, including indentation and final LF.
      target.append(node("span", line, "patch-line patch-" + type));
    });
  }
  function renderPair() {
    const row = item(), fixture = fixtures.find(x => x.id === row.caseId);
    display("assessment");
    $("context-title").textContent = fixture.title;
    $("context-summary").textContent = fixture.summary;
    $("issue").textContent = fixture.issue;
    renderPatch(fixture.patch);
    $("evidence").open = false;
    renderDescription($("description-a"), fixture.descriptions.find(x => x.id === row.aId));
    renderDescription($("description-b"), fixture.descriptions.find(x => x.id === row.bId));
    const answer = drafts.get(row.caseId) || saved.get(row.caseId) || { choice: "", uncertainty: null, reason: "" };
    radios.forEach(radio => { radio.checked = radio.value === answer.choice; });
    $("uncertainty").value = answer.uncertainty || "";
    $("reason").value = answer.reason;
    updateUncertainty();
    $("previous").disabled = position === 0;
    $("validation").textContent = "";
    $("save-status").textContent = saved.has(row.caseId) ? "This answer is saved in tab memory. You may edit it." : "";
    updateProgress();
    focusTitle("assessment-title");
  }
  function complete() {
    display("completion");
    $("answer-summary").replaceChildren();
    session.schedule.forEach((row, i) => {
      const fixture = fixtures.find(x => x.id === row.caseId), answer = saved.get(row.caseId);
      const article = node("article", null, "summary-item");
      article.append(node("h2", `Pair ${i + 1}: ${fixture.title}`), node("p", core.choiceLabel(answer)), node("p", answer.reason, "summary-reason"));
      $("answer-summary").append(article);
    });
    $("download-status").textContent = "";
    focusTitle("completion-title");
  }
  $("start").addEventListener("click", () => {
    if (session) { renderPair(); return; }
    if (!$("experience").value || !$("familiarity").value) {
      $("setup-error").textContent = "Choose both demo background responses, or select Prefer not to say.";
      return;
    }
    const [seed, formDraw] = crypto.getRandomValues(new Uint32Array(2));
    // Demo-only assignment; live study forms remain custodian-controlled.
    const form = (formDraw & 1) === 0 ? "X" : "Y";
    session = { id: "DEMO-" + seed.toString(16), seed, form, startedAt: new Date().toISOString(),
      profile: { experience: $("experience").value, familiarity: $("familiarity").value }, schedule: core.schedule(fixtures, seed, form) };
    position = 0;
    $("setup-error").textContent = "";
    for (const id of ["experience", "familiarity"]) $(id).disabled = true;
    $("start").textContent = "Continue the demo →";
    renderPair();
  });
  radios.forEach(radio => {
    radio.addEventListener("change", () => { updateUncertainty(); rememberEdit(); });
    radio.addEventListener("keydown", event => {
      // Space and arrow keys use native radio behavior; also support Enter.
      if (event.key === "Enter") { event.preventDefault(); radio.click(); }
    });
  });
  $("uncertainty").addEventListener("change", rememberEdit);
  $("reason").addEventListener("input", rememberEdit);
  $("previous").addEventListener("click", () => { drafts.set(item().caseId, readAnswer()); if (position > 0) position--; renderPair(); });
  $("overview").addEventListener("click", () => { drafts.set(item().caseId, readAnswer()); display("welcome"); window.scrollTo(0, 0); });
  $("save").addEventListener("click", () => {
    const answer = readAnswer(), error = core.validate(answer);
    if (error) { $("validation").textContent = error; return; }
    const row = { ...answer, caseId: item().caseId, reason: answer.reason.trim(), savedAt: new Date().toISOString(),
      displayMode: matchMedia("(max-width: 640px)").matches ? "stacked" : "side-by-side", viewportWidth: innerWidth };
    drafts.set(row.caseId, row); saved.set(row.caseId, row);
    if (saved.size === session.schedule.length) { complete(); return; }
    const next = session.schedule.findIndex((x, i) => i > position && !saved.has(x.caseId));
    position = next >= 0 ? next : session.schedule.findIndex(x => !saved.has(x.caseId));
    renderPair();
  });
  $("review").addEventListener("click", () => { position = 0; renderPair(); });
  $("download").addEventListener("click", () => {
    const data = core.makeExport(session, [...saved.values()], new Date().toISOString());
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = node("a");
    link.href = url; link.download = "DEMO_ONLY-preference-v2.json";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("download-status").textContent = "Demo download requested. Nothing was submitted to a server.";
  });
  $("restart").addEventListener("click", () => {
    if (!window.confirm("Discard all demo answers in this tab and start over?")) return;
    session = null; position = 0; drafts.clear(); saved.clear();
    for (const id of ["experience", "familiarity"]) $(id).disabled = false;
    $("experience").value = ""; $("familiarity").value = "";
    $("start").textContent = "Start the five-pair demo →";
    display("welcome"); window.scrollTo(0, 0);
  });
})();
