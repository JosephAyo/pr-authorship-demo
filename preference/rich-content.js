/* Structured display content only. No HTML parsing, external URLs, or packet import. */
(function () {
  'use strict';
  const blockTags = new Set(['p', 'h2', 'h3', 'h4', 'blockquote']);
  const inlineTags = new Set(['code', 'strong', 'em', 'del']);
  const assets = new Set(['assets/demo-export.svg']);
  function element(tag, text) {
    const el = document.createElement(tag);
    if (text != null) el.textContent = text;
    return el;
  }
  function inline(target, value) {
    if (typeof value === 'string') { target.append(document.createTextNode(value)); return; }
    if (!Array.isArray(value)) throw new Error('Invalid inline content');
    for (const part of value) {
      if (typeof part === 'string') target.append(document.createTextNode(part));
      else if (Array.isArray(part) && inlineTags.has(part[0]) && typeof part[1] === 'string') target.append(element(part[0], part[1]));
      else if (Array.isArray(part) && part[0] === 'br') target.append(element('br'));
      else throw new Error('Unsupported inline content');
    }
  }
  function picture(spec) {
    const figure = element('figure');
    figure.className = 'evidence-image';
    if (!spec || !assets.has(spec.src) || typeof spec.alt !== 'string' || !spec.alt.trim()) {
      figure.append(element('p', 'Screenshot unavailable: missing or unsupported asset.'));
      figure.classList.add('asset-unavailable');
      return figure;
    }
    const button = element('button'); button.type = 'button'; button.className = 'image-button';
    button.setAttribute('aria-label', 'Enlarge screenshot: ' + spec.alt);
    const img = element('img'); img.alt = spec.alt; img.src = spec.src;
    img.addEventListener('error', () => {
      button.replaceWith(element('p', 'Screenshot unavailable. This evidence could not be loaded.'));
      figure.classList.add('asset-unavailable');
    });
    button.append(img);
    button.addEventListener('click', () => {
      const dialog = document.getElementById('image-dialog');
      const large = document.getElementById('zoom-image');
      large.src = spec.src; large.alt = spec.alt;
      document.getElementById('zoom-caption').textContent = spec.caption || spec.alt;
      document.getElementById('zoom-original').checked = false;
      large.classList.remove('original-size');
      dialog.showModal();
    });
    figure.append(button, element('figcaption', spec.caption || spec.alt), element('span', 'Select image to enlarge'));
    return figure;
  }
  function blocks(target, values) {
    const fragment = document.createDocumentFragment();
    for (const [kind, value] of values) {
      let el;
      if (blockTags.has(kind)) { el = element(kind); inline(el, value); }
      else if (kind === 'ul' || kind === 'ol') {
        el = element(kind);
        for (const item of value) { const li = element('li'); inline(li, item); el.append(li); }
      } else if (kind === 'tasks') {
        el = element('ul'); el.className = 'content-tasks';
        for (const item of value) {
          const li = element('li'), check = element('input'), text = element('span');
          check.type = 'checkbox'; check.checked = item.checked === true; check.disabled = true;
          check.setAttribute('aria-label', item.checked ? 'Completed source checklist item' : 'Uncompleted source checklist item');
          inline(text, item.text); li.append(check, text); el.append(li);
        }
      } else if (kind === 'pre') { el = element('pre'); el.append(element('code', value)); }
      else if (kind === 'hr') el = element('hr');
      else if (kind === 'image') el = picture(value);
      else if (kind === 'table') {
        el = element('div'); el.className = 'content-table'; el.tabIndex = 0;
        el.setAttribute('role', 'region'); el.setAttribute('aria-label', value.caption);
        const table = element('table'), head = element('thead'), row = element('tr'), body = element('tbody');
        table.append(element('caption', value.caption));
        for (const label of value.headers) { const th = element('th'); th.scope = 'col'; inline(th, label); row.append(th); }
        head.append(row);
        for (const cells of value.rows) { const tr = element('tr'); for (const cell of cells) { const td = element('td'); inline(td, cell); tr.append(td); } body.append(tr); }
        table.append(head, body); el.append(table);
      } else throw new Error('Unsupported content block: ' + kind);
      fragment.append(el);
    }
    target.replaceChildren(fragment);
  }
  function examples(target, files) {
    target.replaceChildren();
    target.hidden = !files?.length;
    if (target.hidden) return;
    target.append(element('h3', 'Shared example files'));
    for (const file of files) {
      const details = element('details'); details.className = 'example-file';
      details.append(element('summary', file.label));
      if (typeof file.text !== 'string' || !file.text.trim()) details.append(element('p', 'Example file unavailable.'));
      else { const pre = element('pre'); pre.append(element('code', file.text)); details.append(pre); }
      target.append(details);
    }
  }
  window.PreferenceContent = { blocks, examples };
})();
