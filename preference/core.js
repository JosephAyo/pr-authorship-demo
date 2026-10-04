/* Pure demo logic. Seed/form controls are QA conveniences, not live assignment. */
(function (root) {
  "use strict";
  const VERSION = "preference-v2-demo-2";
  function randomGenerator(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let n = Math.imul(state ^ state >>> 15, state | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function schedule(fixtures, seed, form) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new Error("Invalid demo seed");
    if (!["X", "Y"].includes(form)) throw new Error("Invalid form");
    if (new Set(fixtures.map(x => x.id)).size !== fixtures.length || fixtures.some(x => x.descriptions.length !== 2)) throw new Error("Invalid fixtures");
    const random = randomGenerator(seed);
    const ordered = shuffle(fixtures, random);
    const sides = shuffle(ordered.map((_, i) => i % 2), random);
    const x = ordered.map((item, i) => ({ caseId: item.id, aId: item.descriptions[sides[i]].id, bId: item.descriptions[1 - sides[i]].id }));
    return form === "X" ? x : x.slice().reverse().map(item => ({ caseId: item.caseId, aId: item.bId, bId: item.aId }));
  }
  function validate(answer) {
    if (!["A", "B", "unsure"].includes(answer?.choice)) return "Choose A, B, or Not sure.";
    if (answer.choice === "unsure" && !["no_clear_preference", "insufficient_information"].includes(answer.uncertainty)) return "Choose what Not sure means here.";
    if (answer.choice !== "unsure" && answer.uncertainty != null) return "Only Not sure can have an uncertainty category.";
    if (typeof answer.reason !== "string" || !answer.reason.trim()) return "Please add a short explanation of your choice.";
    if (answer.reason.length > 6000) return "Please keep your explanation within 6,000 characters.";
    return null;
  }
  function choiceLabel(answer) {
    if (answer.choice === "unsure") return answer.uncertainty === "no_clear_preference" ? "Not sure: no clear preference" : "Not sure: insufficient information";
    return "Description " + answer.choice;
  }
  function makeExport(session, answers, exportedAt) {
    if (answers.length !== session.schedule.length) throw new Error("Incomplete demo");
    if (new Set(answers.map(x => x.caseId)).size !== answers.length) throw new Error("Duplicate answer");
    const rows = session.schedule.map((item, i) => {
      const answer = answers.find(x => x.caseId === item.caseId);
      const error = validate(answer);
      if (error) throw new Error(error);
      return { caseId: item.caseId, position: i + 1, aId: item.aId, bId: item.bId,
        choice: answer.choice, uncertainty: answer.uncertainty, reason: answer.reason.trim(),
        savedAt: answer.savedAt, displayMode: answer.displayMode, viewportWidth: answer.viewportWidth };
    });
    return { schemaVersion: VERSION, status: "DEMO_ONLY", synthetic: true, researchData: false,
      submitted: false, productionPacket: false, sessionId: session.id, startedAt: session.startedAt,
      exportedAt, demoSeed: session.seed, demoForm: session.form, profile: { ...session.profile }, answers: rows };
  }
  const api = { VERSION, schedule, validate, choiceLabel, makeExport };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PreferenceCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
