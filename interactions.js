/* Local opening counts only: no network, storage, timers, or reading inference. */
(function (root) {
  'use strict';
  const SCHEMA = 'evidence-open-counts-v1';
  const semantics = 'Openings/enlargements, not proof of reading; issue text shares the evidence panel. Indexed entries are zero-based within the displayed case/context; absent entries mean zero.';
  function create(caseIds, enabled) {
    const empty = () => caseIds.map(caseId => ({caseId, sharedEvidenceOpens: 0, exampleOpens: {}, patchOpens: {}, imageEnlargements: {}}));
    let rows = empty(), dispose = () => {};
    function count(caseId, field, key) {
      if (!enabled()) return;
      const row = rows.find(r => r.caseId === caseId);
      if (!row) throw Error('Unknown interaction case');
      if (key == null) row[field]++;
      else row[field][key] = (row[field][key] || 0) + 1;
    }
    function bind(caseId, {evidence, examples, patches, images}) {
      dispose();
      const cleanup = [];
      const listen = (el, type, fn) => {el.addEventListener(type, fn);cleanup.push(() => el.removeEventListener(type, fn));};
      function opening(el, field, key) {
        listen(el, 'toggle', () => {
          // Render/navigation closes panels. Only openings of live panels count.
          if (el.isConnected && el.open) count(caseId, field, key);
        });
      }
      opening(evidence, 'sharedEvidenceOpens');
      examples.forEach((el, i) => opening(el, 'exampleOpens', String(i)));
      patches.forEach((el, i) => opening(el, 'patchOpens', String(i)));
      for (const [context, buttons] of Object.entries(images)) buttons.forEach((el, i) => {
        listen(el, 'click', () => {if (el.isConnected && !el.disabled) count(caseId, 'imageEnlargements', context + ':' + i);});
      });
      dispose = () => cleanup.forEach(fn => fn());
    }
    function snapshot() {return JSON.parse(JSON.stringify({schema: SCHEMA, semantics, cases: rows}));}
    function restore(data) {
      if (!data || data.schema !== SCHEMA || !Array.isArray(data.cases) || data.cases.length !== caseIds.length) throw Error('Missing or incompatible evidence interaction record.');
      const integer = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000;
      const map = (value, pattern) => {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 10000) throw Error('Invalid interaction counts.');
        return Object.fromEntries(Object.entries(value).map(([key, n]) => {
          if (!pattern.test(key) || !integer(n)) throw Error('Invalid interaction counts.');
          return [key, n];
        }));
      };
      const next = caseIds.map(caseId => {
        const matches = data.cases.filter(r => r && r.caseId === caseId);
        if (matches.length !== 1 || !integer(matches[0].sharedEvidenceOpens)) throw Error('Invalid interaction case.');
        const r = matches[0];
        return {caseId, sharedEvidenceOpens: r.sharedEvidenceOpens,
          exampleOpens: map(r.exampleOpens, /^(0|[1-9]\d{0,3})$/), patchOpens: map(r.patchOpens, /^(0|[1-9]\d{0,3})$/),
          imageEnlargements: map(r.imageEnlargements, /^(description-a|description-b|issues):(0|[1-9]\d{0,3})$/)};
      });
      rows = next;
    }
    return {bind, snapshot, restore, reset() {dispose();rows = empty();}};
  }
  const api = {create, SCHEMA};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EvidenceInteractions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
