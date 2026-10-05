import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_BOUNDS, MAX_OBJECTS, RIVER_END_Z, createInitialWorld,
  heightAt, riverPath, scatterAt, validateWorld, cloneWorld,
  serializeWorld, deserializeWorld, worldSummary,
} from '../demo/world.js';

test('seeded generation and save/reload restore identical terrain, river and painted objects', () => {
  const world = createInitialWorld(812);
  assert.deepEqual(createInitialWorld(812), world);
  assert.notDeepEqual(createInitialWorld(813).objects, world.objects);
  scatterAt(world, 'flower', -9, 3, 4, 30, 91);
  world.atmosphere = 'mist';
  world.reducedMotion = true;
  const loaded = deserializeWorld(serializeWorld(world));
  assert.deepEqual(loaded, world);
  assert.deepEqual(riverPath(loaded), riverPath(world));
  for (const [x, z] of [[-14, 4], [2, 19], [23, -11]]) assert.equal(heightAt(x, z, loaded), heightAt(x, z, world));
  loaded.objects[0].scale = 2;
  assert.notEqual(loaded.objects[0].scale, world.objects[0].scale);
});

test('the complete river follows the carved valley and descends for valid spring extremes', () => {
  for (const seed of [0, 1, 812, 0xffffffff]) {
    for (const [x, z] of [[4, 21], [-12, -12], [12, 24]]) {
      const world = createInitialWorld(seed);
      world.spring = { x, z };
      for (const width of [0.8, 3]) {
        world.terrain.riverWidth = width;
        validateWorld(world);
        const path = riverPath(world);
        assert.equal(path.length, 96);
        assert.equal(path[0].x, x);
        assert.equal(path[0].z, z);
        assert.equal(path.at(-1).z, RIVER_END_Z);
        for (let index = 0; index < path.length; index++) {
          const point = path[index];
          assert.ok(Number.isFinite(point.y));
          assert.ok(point.x >= WORLD_BOUNDS.minX && point.x <= WORLD_BOUNDS.maxX);
          assert.ok(point.z >= WORLD_BOUNDS.minZ && point.z <= WORLD_BOUNDS.maxZ);
          assert.equal(point.y, heightAt(point.x, point.z, world) + 0.06);
          assert.ok(heightAt(point.x - width, point.z, world) > point.y - 0.06);
          assert.ok(heightAt(point.x + width, point.z, world) > point.y - 0.06);
          if (index) {
            assert.ok(point.z < path[index - 1].z);
            assert.ok(point.y < path[index - 1].y, 'river must not rise downstream');
          }
        }
      }
    }
  }
});

test('height samples stay finite and bounded across the island', () => {
  for (const seed of [0, 492, 0xffffffff]) {
    const world = createInitialWorld(seed);
    for (let x = -32; x <= 32; x += 2) for (let z = -32; z <= 32; z += 2) {
      const height = heightAt(x, z, world);
      assert.ok(Number.isFinite(height) && height >= 0 && height <= world.terrain.height);
    }
    assert.equal(heightAt(32, 0, world), 0);
    assert.equal(heightAt(0, -32, world), 0);
    assert.ok(world.objects.length > 600 && world.objects.length < MAX_OBJECTS);
    assert.equal(worldSummary(world).objectCount, world.objects.length);
    validateWorld(world);
  }
  assert.throws(() => heightAt(NaN, 0, createInitialWorld()), /Invalid world/);
});

test('painting is seeded, clipped at bounds, never overruns the cap and preserves unique ids', () => {
  const a = createInitialWorld(4);
  const b = cloneWorld(a);
  const added = scatterAt(a, 'tree', -13, 2, 5, 50, 9);
  assert.ok(added.length > 0);
  assert.deepEqual(scatterAt(b, 'tree', -13, 2, 5, 50, 9), added);
  assert.deepEqual(a, b);
  scatterAt(a, 'flower', -32, -4, 12, 250, 14);
  validateWorld(a);
  const existing = a.objects[0];
  a.objects = Array.from({ length: MAX_OBJECTS - 1 }, (_, index) => ({ ...existing, id: `cap${index}` }));
  assert.ok(scatterAt(a, 'flower', -13, 2, 5, 30, 99).length <= 1);
  assert.ok(a.objects.length <= MAX_OBJECTS);
  assert.equal(new Set(a.objects.map((object) => object.id)).size, a.objects.length);
  assert.throws(() => scatterAt(a, 'unknown', 0, 0), /unsupported/);
  assert.throws(() => scatterAt(a, 'tree', 0, 0, 3, Infinity), /Invalid world/);
});

test('invalid numeric, enum, duplicate and unsupported-version imports fail before adoption', () => {
  const source = createInitialWorld(52);
  const mutations = [
    (w) => { w.version = 2; },
    (w) => { w.seed = -1; },
    (w) => { w.seed = 1.4; },
    (w) => { w.terrain.height = NaN; },
    (w) => { w.terrain.size = 10000; },
    (w) => { w.spring.z = -30; },
    (w) => { w.objects[0].x = Infinity; },
    (w) => { w.objects[0].scale = -2; },
    (w) => { w.objects[0].type = 'script'; },
    (w) => { w.objects[1].id = w.objects[0].id; },
    (w) => { w.atmosphere = '<script>'; },
    (w) => { w.reducedMotion = 'false'; },
    (w) => { w.name = '\u0000bad'; },
  ];
  for (const mutate of mutations) {
    const input = cloneWorld(source);
    mutate(input);
    assert.throws(() => validateWorld(input), /Invalid world/);
  }
  assert.deepEqual(source, createInitialWorld(52));
  assert.throws(() => deserializeWorld('{oops'), /malformed JSON/);
  assert.throws(() => deserializeWorld(' '.repeat(1024 * 1024 + 1)), /larger/);
});

test('hostile arrays, accessors and prototype-bearing objects are rejected without invoking getters', () => {
  const world = createInitialWorld(28);
  const tooMany = cloneWorld(world);
  tooMany.objects = new Array(MAX_OBJECTS + 1);
  assert.throws(() => validateWorld(tooMany), /at most/);
  const sparse = cloneWorld(world);
  sparse.objects = new Array(2);
  assert.throws(() => validateWorld(sparse), /sparse/);
  let invoked = false;
  const accessor = cloneWorld(world);
  Object.defineProperty(accessor.objects, '0', { get() { invoked = true; throw new Error('getter ran'); } });
  assert.throws(() => validateWorld(accessor), /accessors/);
  assert.equal(invoked, false);
  const recordAccessor = cloneWorld(world);
  Object.defineProperty(recordAccessor, 'seed', { get() { invoked = true; throw new Error('getter ran'); } });
  assert.throws(() => validateWorld(recordAccessor), /accessors/);
  assert.equal(invoked, false);
  const inherited = Object.create(world);
  assert.throws(() => validateWorld(inherited), /plain object/);
  const polluted = JSON.parse(serializeWorld(world));
  Object.defineProperty(polluted.objects[0], '__proto__', { value: { polluted: true }, enumerable: true });
  assert.throws(() => validateWorld(polluted), /forbidden key/);
  assert.equal({}.polluted, undefined);
});
