import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorld, serializeWorld } from '../demo/world.js';
import { SAVE_KEY, saveWorld, loadWorld } from '../demo/storage.js';

function memoryStorage() {
  const items = new Map();
  return {
    getItem(key) { return items.get(key) ?? null; },
    setItem(key, value) { items.set(key, String(value)); },
  };
}

function envelope(world = createInitialWorld(31)) {
  return { format: 'yiyu-save', version: 1, savedAt: '2026-10-05T03:24:18.123Z', world };
}

test('absent saves return null and save/load round-trip keeps world data and metadata', () => {
  const storage = memoryStorage();
  assert.equal(loadWorld(storage), null);
  const world = createInitialWorld(190);
  world.atmosphere = 'sunset';
  world.name = '溪谷与森林';
  const saved = saveWorld(storage, world);
  assert.equal(SAVE_KEY, 'yiyu-world-v1');
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(saved.savedAt));
  assert.deepEqual(saved.world, world);
  assert.deepEqual(loadWorld(storage), saved);
  const raw = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(raw.format, 'yiyu-save');
  assert.equal(raw.version, 1);
  const loaded = loadWorld(storage);
  loaded.world.objects[0].x = -31;
  assert.notEqual(loadWorld(storage).world.objects[0].x, loaded.world.objects[0].x);
  assert.notEqual(world.objects[0].x, loaded.world.objects[0].x);
});

test('validation failure cannot overwrite an existing save or call setItem', () => {
  const storage = memoryStorage();
  saveWorld(storage, createInitialWorld(4));
  const original = storage.getItem(SAVE_KEY);
  let writeCount = 0;
  const failIfWritten = { setItem() { writeCount++; throw new Error('should not write'); } };
  const invalidWorld = createInitialWorld(8);
  invalidWorld.objects[0].x = Infinity;
  assert.throws(() => saveWorld(failIfWritten, invalidWorld), /Invalid world/);
  assert.equal(writeCount, 0);
  assert.throws(() => saveWorld(storage, invalidWorld), /Invalid world/);
  assert.equal(storage.getItem(SAVE_KEY), original);
});

test('quota and access errors propagate; a failed atomic setItem preserves the old save', () => {
  const storage = memoryStorage();
  saveWorld(storage, createInitialWorld(5));
  const original = storage.getItem(SAVE_KEY);
  const quotaError = new Error('quota full');
  quotaError.name = 'QuotaExceededError';
  const quotaStorage = { getItem: storage.getItem, setItem() { throw quotaError; } };
  assert.throws(() => saveWorld(quotaStorage, createInitialWorld(9)), (error) => error === quotaError);
  assert.equal(storage.getItem(SAVE_KEY), original);
  assert.equal(loadWorld(storage).world.seed, 5);
  const denied = new Error('storage disabled');
  denied.name = 'SecurityError';
  assert.throws(() => loadWorld({ getItem() { throw denied; } }), (error) => error === denied);
  assert.throws(() => saveWorld({}, createInitialWorld()), /implement setItem/);
  assert.throws(() => loadWorld({}), /implement getItem/);
});

test('corrupt, wrong-format, unsupported-version and impossible-date envelopes are rejected', () => {
  const storage = memoryStorage();
  for (const raw of ['{oops', '', 'null', '[]', '3', serializeWorld(createInitialWorld(2))]) {
    storage.setItem(SAVE_KEY, raw);
    assert.throws(() => loadWorld(storage), /Invalid save/);
    assert.equal(storage.getItem(SAVE_KEY), raw, 'reading corrupted storage must not clear it');
  }
  const mutations = [
    (save) => { save.format = 'other'; },
    (save) => { save.version = 2; },
    (save) => { save.savedAt = '2026-10-05'; },
    (save) => { save.savedAt = '2026-02-30T03:24:18.123Z'; },
    (save) => { save.savedAt = '2026-10-05T25:24:18.123Z'; },
    (save) => { save.savedAt = '2026-10-05T03:24:18.123+00:00'; },
    (save) => { delete save.savedAt; },
    (save) => { delete save.world; },
  ];
  for (const mutate of mutations) {
    const save = envelope();
    mutate(save);
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    assert.throws(() => loadWorld(storage), /Invalid (save|world)/);
  }
  storage.setItem(SAVE_KEY, ' '.repeat(1024 * 1024 + 1));
  assert.throws(() => loadWorld(storage), /supported size/);
});

test('malicious world and envelope keys cannot pollute prototypes or enter a loaded scene', () => {
  const storage = memoryStorage();
  const badWorld = envelope();
  badWorld.world.objects[0].type = 'script';
  storage.setItem(SAVE_KEY, JSON.stringify(badWorld));
  assert.throws(() => loadWorld(storage), /Invalid world/);
  const tooMany = envelope();
  tooMany.world.objects = Array.from({ length: 2001 }, (_, index) => ({ ...tooMany.world.objects[0], id: `id${index}` }));
  storage.setItem(SAVE_KEY, JSON.stringify(tooMany));
  assert.throws(() => loadWorld(storage), /at most 2000/);
  const raw = JSON.stringify(envelope());
  storage.setItem(SAVE_KEY, raw.replace('{', '{"__proto__":{"polluted":true},'));
  assert.throws(() => loadWorld(storage), /forbidden key/);
  const badObject = envelope();
  Object.defineProperty(badObject.world.objects[0], '__proto__', { value: { polluted: true }, enumerable: true });
  storage.setItem(SAVE_KEY, JSON.stringify(badObject));
  assert.throws(() => loadWorld(storage), /forbidden key/);
  assert.equal({}.polluted, undefined);
});
