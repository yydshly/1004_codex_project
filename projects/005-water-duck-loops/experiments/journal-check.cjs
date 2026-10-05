'use strict';

// Isolated migration checks: the real journal runs against an in-memory DOM
// and localStorage. This script never reads or writes browser records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const journal = fs.readFileSync(path.join(__dirname, '../demo/journal.js'), 'utf8');
const legacyKey = 'water-duck-research-trials-v1';
const currentKey = 'water-duck-research-trials-v2';

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.value = '';
    this.disabled = false;
    this.hidden = false;
    this._text = '';
  }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  append(...children) {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }
  replaceChildren(...children) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.append(...children);
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
  }
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
  fire(type, event = {}) {
    const value = { target: this, preventDefault() {}, ...event };
    for (const handler of this.listeners.get(type) || []) handler(value);
  }
  click() { this.fire('click'); }
}

function record(id, experiment, condition) {
  return {
    id, created: '2026-10-05T04:00:00.000Z', experiment, condition,
    source: 'automated', decision: 'insufficient', order: 'first',
    hypothesis: id + ' 假设', prediction: '', observation: id + ' 观察', next: '',
    hits: experiment === 'B' ? 6 : 4, misses: null,
    nudges: experiment === 'B' ? 2 : 0, withdrawn: false,
  };
}

const oldRecord = record('legacy-a', 'A', 'hints-on');
const reservoirRecord = record('reservoir-b', 'B', 'reservoir-batch');
const originalRecords = [oldRecord, reservoirRecord];
const payload = records => JSON.stringify({ version: 1, records });

function harness(initial = {}, blocked = false) {
  const storage = new Map(Object.entries(initial));
  const writes = [];
  const gate = { blocked };
  const nodes = new Map([
    'trial-form', 'journal-status', 'trial-records', 'trial-count', 'export-trials',
    'newer-trials', 'older-trials', 'trial-page',
  ].map(id => [id, new Element()]));
  const fields = new Map(Object.entries({
    experiment: 'B', source: 'automated', condition: 'reservoir-other',
    decision: 'insufficient', order: 'first', hypothesis: '', prediction: '',
    observation: '', next: '', hits: '', misses: '', nudges: '',
  }).map(([name, value]) => {
    const input = new Element('input'); input.value = value; return [name, input];
  }));
  const form = nodes.get('trial-form');
  form.elements = { namedItem(name) { return fields.get(name); } };
  form.reportValidity = () => true;
  const pagination = new Element('nav');
  const downloads = [];
  const window = new Element();
  let sequence = 0;
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) {
      writes.push({ key, value: String(value), failed: gate.blocked && key === currentKey });
      if (gate.blocked && key === currentKey) throw new Error('Simulated storage quota failure');
      storage.set(key, String(value));
    },
  };
  const document = {
    body: new Element('body'),
    getElementById(id) { assert.ok(nodes.has(id), 'Unexpected DOM id: ' + id); return nodes.get(id); },
    querySelector(selector) { assert.equal(selector, '.record-pagination'); return pagination; },
    createElement(tag) { return new Element(tag); },
  };
  class FormData {
    constructor(selectedForm) { assert.equal(selectedForm, form); }
    get(name) { return fields.get(name)?.value ?? null; }
  }
  vm.runInNewContext(journal, {
    document, window, localStorage, FormData, Date, Intl, Blob,
    crypto: { randomUUID() { return 'new-record-' + (++sequence); } },
    URL: {
      createObjectURL(blob) { downloads.push(blob); return 'blob:isolated-journal'; },
      revokeObjectURL() {},
    },
    setTimeout(callback) { callback(); return 1; },
  }, { filename: 'demo/journal.js' });
  return {
    storage, writes, gate, nodes, fields, downloads,
    data() { return storage.has(currentKey) ? JSON.parse(storage.get(currentKey)) : null; },
    visible() { return nodes.get('trial-records').textContent; },
    overwriteFromOldPage(records) {
      storage.set(legacyKey, payload(records));
      window.fire('storage', { key: legacyKey, newValue: storage.get(legacyKey) });
    },
    submit(hypothesis = '新 V4 检查', observation = '迁移后的保存操作') {
      fields.get('hypothesis').value = hypothesis;
      fields.get('observation').value = observation;
      fields.get('hits').value = '6';
      fields.get('nudges').value = '2';
      form.fire('submit');
    },
    export() { nodes.get('export-trials').click(); return downloads.at(-1); },
  };
}

async function main() {
  const originalLegacy = payload(originalRecords);
  const migrated = harness({ [legacyKey]: originalLegacy });
  assert.deepEqual(migrated.data(), { version: 1, records: originalRecords });
  assert.equal(migrated.storage.get(legacyKey), originalLegacy, 'Migration must not alter the old key');
  assert.equal(migrated.nodes.get('trial-count').textContent, '2 条实验记录');
  assert.ok(migrated.visible().includes(oldRecord.hypothesis), 'The migrated A record stays visible');
  assert.ok(migrated.visible().includes(reservoirRecord.hypothesis), 'The migrated B record stays visible');
  assert.ok(migrated.visible().includes('救援：6'), 'V4 records retain their count meaning');
  assert.ok(migrated.visible().includes('入圈：4'), 'V3 records retain their count meaning');

  const beforeOldWrite = migrated.storage.get(currentKey);
  const oldPageRecord = record('old-page-later', 'A', 'hints-off');
  migrated.overwriteFromOldPage([oldPageRecord]);
  assert.equal(migrated.storage.get(currentKey), beforeOldWrite, 'Old-page writes must not overwrite v2');
  assert.equal(migrated.nodes.get('trial-count').textContent, '2 条实验记录');
  assert.ok(!migrated.visible().includes(oldPageRecord.hypothesis), 'Old-page records are not silently merged');

  const legacyAfterOldPageWrite = migrated.storage.get(legacyKey);
  migrated.submit();
  assert.equal(migrated.data().records.length, 3, 'New entries save to v2');
  assert.deepEqual(migrated.data().records.slice(0, 2), originalRecords);
  assert.equal(migrated.data().records.at(-1).condition, 'reservoir-other');
  assert.equal(migrated.storage.get(legacyKey), legacyAfterOldPageWrite, 'New-page saves leave v1 alone');
  assert.equal(migrated.fields.get('observation').value, '', 'Successful saves clear result inputs');

  const currentFirst = harness({ [legacyKey]: originalLegacy, [currentKey]: payload([reservoirRecord]) });
  assert.deepEqual(currentFirst.data().records, [reservoirRecord], 'Existing v2 takes priority');
  assert.equal(currentFirst.nodes.get('trial-count').textContent, '1 条实验记录');
  assert.equal(currentFirst.writes.length, 0, 'Reading existing v2 must not remigrate v1');

  const emptyCurrent = harness({ [legacyKey]: originalLegacy, [currentKey]: payload([]) });
  assert.deepEqual(emptyCurrent.data().records, [], 'An empty v2 store still takes priority');
  assert.equal(emptyCurrent.nodes.get('trial-count').textContent, '还没有实验记录');
  assert.equal(emptyCurrent.writes.length, 0);

  const unavailable = harness({ [legacyKey]: originalLegacy }, true);
  assert.equal(unavailable.storage.has(currentKey), false);
  assert.equal(unavailable.storage.get(legacyKey), originalLegacy);
  assert.equal(unavailable.nodes.get('trial-count').textContent, '2 条实验记录', 'Migration failure must not clear visible records');
  assert.ok(unavailable.visible().includes(oldRecord.hypothesis));
  assert.ok(unavailable.visible().includes(reservoirRecord.hypothesis));
  const exported = JSON.parse(await unavailable.export().text());
  assert.equal(exported.schema, 'water-duck-trials');
  assert.equal(exported.version, 1, 'Storage-key migration must not change the export structure version');
  assert.deepEqual(exported.records, originalRecords, 'Fallback records remain exportable');

  unavailable.submit('保留输入检查', '保存失败时观察仍在');
  assert.equal(unavailable.nodes.get('trial-count').textContent, '2 条实验记录');
  assert.equal(unavailable.fields.get('observation').value, '保存失败时观察仍在');
  assert.equal(unavailable.storage.get(legacyKey), originalLegacy);
  unavailable.gate.blocked = false;
  unavailable.submit('恢复写入检查', '新存储恢复后连同旧记录保存');
  assert.equal(unavailable.data().records.length, 3);
  assert.deepEqual(unavailable.data().records.slice(0, 2), originalRecords);
  assert.equal(unavailable.storage.get(legacyKey), originalLegacy);

  console.log('Journal checks passed: v1 migration, v2 priority, old-page isolation, normal save, failed-migration visibility/export and write recovery.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
